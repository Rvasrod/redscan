export interface Device {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  is_gateway: boolean;
  first_seen?: string;
  last_seen?: string;
}

export interface NetworkInfo {
  ssid: string;
  gateway_ip: string;
  gateway_mac?: string;
  subnet?: string;
  interface_name?: string;
  interface_ip?: string;
  interface_mac?: string;
}

export interface PortScanResult {
  port: number;
  state: string;
  service: string;
  version: string;
}

export interface Vulnerability {
  cveId: string;
  port: number;
  service: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface LatencyMeasurement {
  timestamp: string;
  target: string;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  jitterMs: number;
  packetLossPct: number;
}

export interface NetworkEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface Snapshot {
  id: string;
  networkId: string;
  capturedAt: string;
  deviceCount: number;
  devices: Device[];
}

export interface DiscoveryResult {
  network: NetworkInfo;
  devices: Device[];
  device_count: number;
  scan_duration_ms: number;
}
