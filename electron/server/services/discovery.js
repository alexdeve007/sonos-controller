const { DeviceDiscovery, Sonos } = require('sonos');
const dgram = require('dgram');
const os = require('os');
const http = require('http');
const { setSpeaker, clearSpeakers } = require('../state');
const { getSpeakerInfo } = require('./sonosClient');
const Store = require('electron-store');

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const SONOS_SEARCH_TARGET = 'urn:schemas-upnp-org:device:ZonePlayer:1';
const SSDP_SEARCH = [
  'M-SEARCH * HTTP/1.1',
  `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}`,
  'MAN: "ssdp:discover"',
  'MX: 3',
  `ST: ${SONOS_SEARCH_TARGET}`,
  '',
  '',
].join('\r\n');

/**
 * Strategy 1: Use the sonos library's built-in discovery
 */
function libraryDiscovery(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const found = new Set();
    const discovery = DeviceDiscovery({ timeout: timeoutMs });

    discovery.on('DeviceAvailable', (device) => {
      if (device.host) found.add(device.host);
    });

    discovery.on('timeout', () => {
      resolve([...found]);
    });

    setTimeout(() => resolve([...found]), timeoutMs + 1000);
  });
}

/**
 * Strategy 2: Raw SSDP multicast search (more reliable on some networks)
 */
function rawSsdpDiscovery(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const found = new Set();
    const sockets = [];

    // Get all local network interfaces
    const interfaces = os.networkInterfaces();
    const localAddresses = [];
    for (const [, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          localAddresses.push(addr.address);
        }
      }
    }

    // Create a socket per interface for better multicast coverage
    for (const localAddr of localAddresses) {
      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.on('message', (msg) => {
          const text = msg.toString();
          if (text.toLowerCase().includes('zoneplayer') || text.toLowerCase().includes('sonos')) {
            const locMatch = text.match(/LOCATION:\s*http:\/\/([^:/]+)/i);
            if (locMatch) found.add(locMatch[1]);
          }
        });

        socket.on('error', () => {});

        socket.bind(0, localAddr, () => {
          try {
            socket.addMembership(SSDP_ADDRESS, localAddr);
          } catch (e) { /* ignore */ }
          const buf = Buffer.from(SSDP_SEARCH);
          // Send multiple times for reliability
          socket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS);
          setTimeout(() => socket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS), 500);
          setTimeout(() => socket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS), 1500);
        });

        sockets.push(socket);
      } catch (e) { /* ignore interface */ }
    }

    // Also try a generic socket without binding to a specific interface
    try {
      const genericSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      genericSocket.on('message', (msg) => {
        const text = msg.toString();
        if (text.toLowerCase().includes('zoneplayer') || text.toLowerCase().includes('sonos')) {
          const locMatch = text.match(/LOCATION:\s*http:\/\/([^:/]+)/i);
          if (locMatch) found.add(locMatch[1]);
        }
      });
      genericSocket.on('error', () => {});
      genericSocket.bind(0, () => {
        const buf = Buffer.from(SSDP_SEARCH);
        genericSocket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS);
        setTimeout(() => genericSocket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS), 500);
        setTimeout(() => genericSocket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS), 1500);
      });
      sockets.push(genericSocket);
    } catch (e) { /* ignore */ }

    setTimeout(() => {
      sockets.forEach((s) => { try { s.close(); } catch (e) {} });
      resolve([...found]);
    }, timeoutMs);
  });
}

/**
 * Strategy 3: Scan common IPs on the local subnet for Sonos port 1400
 */
function subnetScan(timeoutMs = 10000) {
  return new Promise((resolve) => {
    const found = new Set();
    const interfaces = os.networkInterfaces();
    const subnets = [];

    for (const [, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const parts = addr.address.split('.');
          subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
        }
      }
    }

    let pending = 0;
    const perHostTimeout = Math.min(1500, timeoutMs / 2);

    for (const subnet of [...new Set(subnets)]) {
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        pending++;

        const req = http.get(`http://${ip}:1400/xml/device_description.xml`, { timeout: perHostTimeout }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            if (data.includes('Sonos') || data.includes('ZonePlayer')) {
              found.add(ip);
            }
            pending--;
          });
        });

        req.on('error', () => { pending--; });
        req.on('timeout', () => { req.destroy(); pending--; });
      }
    }

    // Resolve when done or timeout
    const check = setInterval(() => {
      if (pending <= 0) {
        clearInterval(check);
        resolve([...found]);
      }
    }, 200);

    setTimeout(() => {
      clearInterval(check);
      resolve([...found]);
    }, timeoutMs);
  });
}

/**
 * Main discovery: run SSDP strategies in parallel, fall back to subnet scan
 */
async function discoverSpeakers() {
  console.log('[Discovery] Starting speaker discovery...');

  // Run both SSDP methods in parallel
  const [libResults, rawResults] = await Promise.all([
    libraryDiscovery(8000).catch(() => []),
    rawSsdpDiscovery(8000).catch(() => []),
  ]);

  let allIps = new Set([...libResults, ...rawResults]);
  console.log(`[Discovery] SSDP found ${allIps.size} speaker(s): ${[...allIps].join(', ') || 'none'}`);

  // If SSDP found nothing, fall back to subnet scan
  if (allIps.size === 0) {
    console.log('[Discovery] SSDP failed, falling back to subnet scan on port 1400...');
    const scanResults = await subnetScan(15000).catch(() => []);
    allIps = new Set(scanResults);
    console.log(`[Discovery] Subnet scan found ${allIps.size} speaker(s): ${[...allIps].join(', ') || 'none'}`);
  }

  // Add manual/saved speakers
  const store = new Store();
  const overrides = store.get('speakerOverrides', []);
  for (const override of overrides) {
    allIps.add(override.ip);
  }

  // Saved IPs from previous successful discoveries
  const savedIps = store.get('lastKnownSpeakerIps', []);
  for (const ip of savedIps) {
    allIps.add(ip);
  }

  // Resolve all found IPs to speaker info
  const results = await Promise.allSettled(
    [...allIps].map(async (ip) => {
      const device = new Sonos(ip);
      const info = await getSpeakerInfo(device);
      // Apply name overrides
      const override = overrides.find((o) => o.ip === ip);
      if (override?.name) info.name = override.name;
      setSpeaker(info.id, info);
      return ip;
    })
  );

  // Save successful IPs for next time
  const successfulIps = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
  if (successfulIps.length > 0) {
    store.set('lastKnownSpeakerIps', successfulIps);
  }

  console.log(`[Discovery] Resolved ${successfulIps.length} speaker(s) total`);
}

module.exports = { discoverSpeakers };
