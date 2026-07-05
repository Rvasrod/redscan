export interface Device {
  id: string;
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  isGateway: boolean;
  firstSeen: string;
  lastSeen: string;
}

export interface NetworkInfo {
  ssid: string;
  gatewayIp: string;
  gatewayMac: string;
  subnet: string;
  interfaceName: string;
  interfaceIp: string;
  interfaceMac: string;
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
