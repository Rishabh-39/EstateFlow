import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { isStrongJwtConfigured } from './shared/frontdesk-contract';
import { RequestLimiter, RATE_POLICIES, publicWriteRoute, isPrivateResponsePath } from './shared/request-security';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { resolveCorsOrigins } from './shared/cors-config';
async function bootstrap(){
 if(process.env.NODE_ENV==='test' && process.env.DB_NAME!=='estateflow_test')throw new Error('Test server must use estateflow_test database');
 if(!isStrongJwtConfigured(process.env.JWT_SECRET))throw new Error('Set a random JWT_SECRET of at least 32 characters in .env');
 const app=await NestFactory.create(AppModule,{bufferLogs:true});
 // Do not identify the underlying Express server in HTTP responses.
 app.getHttpAdapter().getInstance().disable('x-powered-by');
 // Local development protection: single-process bounded counters and safe API headers.
 const limiter=new RequestLimiter();
 app.use((req:Request,res:Response,next:NextFunction)=>{
  // Server-owned tracing ID; never copy an untrusted caller-supplied ID into response headers.
  res.setHeader('X-Request-ID',randomUUID());
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  if(isPrivateResponsePath(req.originalUrl))res.setHeader('Cache-Control','no-store');
  const route=publicWriteRoute(req.method,req.originalUrl);
  if(!route)return next();
  // Use the TCP peer address, not client-controlled X-Forwarded-For.
  // A trusted reverse proxy/shared-store configuration is required for production scaling.
  const ip=req.socket.remoteAddress||'unknown';
  const result=limiter.take(`${route}:${ip}`,RATE_POLICIES[route]);
  res.setHeader('X-RateLimit-Limit',String(RATE_POLICIES[route].limit));
  res.setHeader('X-RateLimit-Remaining',String(result.remaining));
  if(!result.allowed){
   res.setHeader('Retry-After',String(result.retryAfterSeconds));
   res.status(429).json({statusCode:429,error:'Too Many Requests',message:'Request limit exceeded. Please retry later.'});
   return;
  }
  next();
 });
 app.enableCors({origin:resolveCorsOrigins(process.env.CORS_ORIGIN,process.env.NODE_ENV),credentials:false});
 app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));
 await app.listen(Number(process.env.PORT||4000));
 console.log(`EstateFlow API listening on http://localhost:${process.env.PORT||4000}`);
}
bootstrap().catch(e=>{console.error(e);process.exit(1)});
