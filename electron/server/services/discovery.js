const { DeviceDiscovery, Sonos } = require('sonos');
const dgram = require('dgram');
const os = require('os');
const http = require('http');
const { setSpeaker } = require('../state');
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
 * Get all active IPv4 network interfaces
 */
function getActiveInterfaces() {
  const interfaces = os.networkInterfaces();
  const result = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        result.push({ name, address: addr.address, netmask: addr.netmask });
      }
    }
  }
  return result;
}

/**
 * Calculate all IPs in a subnet from address + netmask
 */
function getSubnetRange(address, netmask) {
  const addrParts = address.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);

  const networkStart = addrParts.map((a, i) => a & maskParts[i]);
  const networkEnd = addrParts.map((a, i) => (a & maskParts[i]) | (~maskParts[i] & 255));

  const ips = [];
  for (let a = networkStart[0]; a <= networkEnd[0]; a++) {
    for (let b = networkStart[1]; b <= networkEnd[1]; b++) {
      for (let c = networkStart[2]; c <= networkEnd[2]; c++) {
        for (let d = networkStart[3] + 1; d < networkEnd[3]; d++) {
          ips.push(`${a}.${b}.${c}.${d}`);
        }
      }
    }
  }
  return ips;
}

/**
 * Strategy 1: Use the sonos library's built-in discovery (wrapped to catch errors)
 */
function libraryDiscovery(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const found = new Set();
    try {
      const discovery = DeviceDiscovery({ timeout: timeoutMs });

      discovery.on('DeviceAvailable', (device) => {
        if (device.host) found.add(device.host);
      });

      discovery.on('timeout', () => {
        resolve([...found]);
      });

      // Catch any errors from the discovery object
      discovery.on('error', (err) => {
        console.log('[Discovery] Library discovery error (non-fatal):', err.message);
      });
    } catch (err) {
      console.log('[Discovery] Library discovery failed to start:', err.message);
    }

    // Safety timeout
    setTimeout(() => resolve([...found]), timeoutMs + 1000);
  });
}

/**
 * Strategy 2: Raw SSDP multicast search on each active interface
 */
function rawSsdpDiscovery(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const found = new Set();
    const sockets = [];
    const activeInterfaces = getActiveInterfaces();

    console.log(`[Discovery] Active interfaces: ${activeInterfaces.map((i) => `${i.name}(${i.address})`).join(', ')}`);

    for (const iface of activeInterfaces) {
      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.on('message', (msg) => {
          const text = msg.toString();
          if (text.toLowerCase().includes('zoneplayer') || text.toLowerCase().includes('sonos')) {
            const locMatch = text.match(/LOCATION:\s*http:\/\/([^:/]+)/i);
            if (locMatch) {
              console.log(`[Discovery] SSDP found device at ${locMatch[1]} via ${iface.name}`);
              found.add(locMatch[1]);
            }
          }
        });

        socket.on('error', (err) => {
          console.log(`[Discovery] Socket error on ${iface.name} (non-fatal): ${err.message}`);
        });

        socket.bind(0, iface.address, () => {
          try {
            socket.setMulticastInterface(iface.address);
          } catch (e) { /* ignore */ }
          try {
            socket.addMembership(SSDP_ADDRESS, iface.address);
          } catch (e) { /* ignore */ }

          const buf = Buffer.from(SSDP_SEARCH);
          const send = () => {
            try { socket.send(buf, 0, buf.length, SSDP_PORT, SSDP_ADDRESS); } catch (e) { /* ignore */ }
          };
          send();
          setTimeout(send, 500);
          setTimeout(send, 1500);
          setTimeout(send, 3000);
        });

        sockets.push(socket);
      } catch (e) {
        console.log(`[Discovery] Failed to create socket on ${iface.name}: ${e.message}`);
      }
    }

    setTimeout(() => {
      sockets.forEach((s) => { try { s.close(); } catch (e) {} });
      resolve([...found]);
    }, timeoutMs);
  });
}

/**
 * Strategy 3: Scan the actual subnet for Sonos port 1400
 * Respects the real netmask (works with /22, /23, /24, etc.)
 */
function subnetScan(timeoutMs = 15000) {
  return new Promise((resolve) => {
    const found = new Set();
    const activeInterfaces = getActiveInterfaces();
    const allIps = new Set();

    for (const iface of activeInterfaces) {
      const ips = getSubnetRange(iface.address, iface.netmask);
      console.log(`[Discovery] Subnet scan: ${iface.name} ${iface.address}/${iface.netmask} → ${ips.length} IPs`);
      ips.forEach((ip) => allIps.add(ip));
    }

    // Cap at 1024 to avoid flooding, scan in batches
    const ipList = [...allIps].slice(0, 1024);
    let pending = ipList.length;

    if (pending === 0) {
      resolve([]);
      return;
    }

    const perHostTimeout = 1500;

    for (const ip of ipList) {
      const req = http.get(`http://${ip}:1400/xml/device_description.xml`, { timeout: perHostTimeout }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (data.includes('Sonos') || data.includes('ZonePlayer')) {
            console.log(`[Discovery] Subnet scan found Sonos at ${ip}`);
            found.add(ip);
          }
          if (--pending <= 0) resolve([...found]);
        });
      });
      req.on('error', () => { if (--pending <= 0) resolve([...found]); });
      req.on('timeout', () => { req.destroy(); });
    }

    setTimeout(() => resolve([...found]), timeoutMs);
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
    for (const ip of scanResults) allIps.add(ip);
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
