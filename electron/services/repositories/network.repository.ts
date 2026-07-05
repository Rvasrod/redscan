import { BaseRepository } from './base.repository';

export interface NetworkRow {
  id: string;
  ssid: string;
  gateway_ip: string;
  gateway_mac: string | null;
  subnet: string | null;
  interface_name: string | null;
  interface_ip: string | null;
  interface_mac: string | null;
  first_seen: string;
  last_seen: string;
}

export class NetworkRepository extends BaseRepository {
  findAll(): NetworkRow[] {
    return this.database.prepare('SELECT * FROM networks ORDER BY last_seen DESC').all() as NetworkRow[];
  }

  findBySsidAndGateway(ssid: string, gatewayIp: string): NetworkRow | undefined {
    return this.database.prepare(
      'SELECT id FROM networks WHERE ssid = ? AND gateway_ip = ?'
    ).get(ssid, gatewayIp) as NetworkRow | undefined;
  }

  findLatest(): NetworkRow | undefined {
    return this.database.prepare(
      'SELECT id FROM networks ORDER BY last_seen DESC LIMIT 1'
    ).get() as NetworkRow | undefined;
  }

  insert(network: {
    id: string; ssid: string; gateway_ip: string; gateway_mac?: string;
    subnet?: string; interface_name?: string; interface_ip?: string;
    interface_mac?: string; first_seen: string; last_seen: string;
  }): void {
    this.database.prepare(
      `INSERT INTO networks (id, ssid, gateway_ip, gateway_mac, subnet, interface_name, interface_ip, interface_mac, first_seen, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(network.id, network.ssid, network.gateway_ip, network.gateway_mac ?? null,
      network.subnet ?? null, network.interface_name ?? null, network.interface_ip ?? null,
      network.interface_mac ?? null, network.first_seen, network.last_seen);
  }

  update(id: string, data: {
    last_seen: string; interface_ip?: string; interface_mac?: string;
    interface_name?: string; subnet?: string; gateway_mac?: string;
  }): void {
    this.database.prepare(
      'UPDATE networks SET last_seen = ?, interface_ip = ?, interface_mac = ?, interface_name = ?, subnet = ?, gateway_mac = ? WHERE id = ?'
    ).run(data.last_seen, data.interface_ip ?? null, data.interface_mac ?? null,
      data.interface_name ?? null, data.subnet ?? null, data.gateway_mac ?? null, id);
  }
}
