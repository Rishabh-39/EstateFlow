import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import 'dotenv/config';
export type SQLClient = Pick<PoolClient,'query'>;
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool = new Pool({
    host:process.env.DB_HOST||'127.0.0.1',
    port:Number(process.env.DB_PORT||5432),
    database:process.env.DB_NAME||'estateflow',
    user:process.env.DB_USER||'rishabh',
    password:process.env.DB_PASSWORD||undefined,
    max:10,
  });
  query<T extends QueryResultRow=any>(sql:string,params:unknown[]=[]){return this.pool.query<T>(sql,params);}
  async transaction<T>(callback:(client:PoolClient)=>Promise<T>,inventoryMutation=false):Promise<T> {
    const client=await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Small resort MVP: serialize ALL inventory mutations across room and event bookings.
      // No other writer may change room_nights, inventory_days, or resource allocations without this lock.
      if(inventoryMutation) await client.query('SELECT pg_advisory_xact_lock(73921401)');
      const result=await callback(client);
      await client.query('COMMIT');
      return result;
    } catch(e) {await client.query('ROLLBACK');throw e;}
    finally {client.release();}
  }
  async onModuleDestroy(){await this.pool.end();}
}
