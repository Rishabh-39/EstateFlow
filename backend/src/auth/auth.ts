import { Injectable, Controller, Get, Post, Body, Req, UseGuards, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, BadRequestException, ConflictException, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/database.service';

type AuthUser={sub:string; role:'GUEST'|'STAFF'|'GM';email:string};
export const CurrentUser=createParamDecorator((_data,ctx:ExecutionContext)=> (ctx.switchToHttp().getRequest() as any).user as AuthUser);
@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private readonly db:DatabaseService) {}
 async canActivate(ctx:ExecutionContext):Promise<boolean> {
  const req=ctx.switchToHttp().getRequest<Request & {user?:AuthUser}>();
  const match=/^Bearer (.+)$/i.exec(req.header('authorization')||'');
  if(!match)throw new UnauthorizedException('Bearer access token required');
  try {
   const claims=jwt.verify(match[1],process.env.JWT_SECRET||'',{algorithms:['HS256']}) as jwt.JwtPayload;
   if(typeof claims.sub!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub)) throw new Error('Invalid subject');
   if(typeof claims.email!=='string' || !['GUEST','STAFF','GM'].includes(String(claims.role))) throw new Error('Invalid claims');
   // Never trust a role cached in an eight-hour JWT: resolve current identity and role.
   const result=await this.db.query('SELECT id,email,role FROM users WHERE id=$1',[claims.sub]);
   const active=result.rows[0];
   if(!active || active.email!==claims.email || active.role!==claims.role) throw new Error('Account or role has changed');
   req.user={sub:active.id,email:active.email,role:active.role};
   return true;
  } catch { throw new UnauthorizedException('Invalid, expired or revoked access token'); }
 }
}
@Injectable()
export class StaffGuard implements CanActivate {
 canActivate(ctx:ExecutionContext){const u=(ctx.switchToHttp().getRequest() as any).user as AuthUser;
  if(!u || !['STAFF','GM'].includes(u.role))throw new ForbiddenException('Staff access required');return true;}
}
@Injectable()
export class AuthService {
 constructor(private readonly db:DatabaseService){}
 async register(data:{email:string;password:string;displayName:string}) {
  const email=String(data.email||'').trim().toLowerCase(), name=String(data.displayName||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||name.length>100||typeof data.password!=='string'||data.password.length<10||data.password.length>128) throw new BadRequestException('Valid email, name and 10-128 character password required');
  const hash=await bcrypt.hash(data.password,12);
  try {const q=await this.db.query(`INSERT INTO users(email,password_hash,role,display_name) VALUES($1,$2,'GUEST',$3) RETURNING id,email,role,display_name`,[email,hash,name]);return q.rows[0];}
  catch(e:any){if(e.code==='23505')throw new ConflictException('Email already registered');throw e;}
 }
 async login(data:{email:string;password:string}) {
  const email=String(data.email||'').trim().toLowerCase();
  const q=await this.db.query(`SELECT id,email,role,display_name,password_hash FROM users WHERE email=$1`,[email]);
  const row=q.rows[0];
  if(!row || typeof data.password!=='string' || !(await bcrypt.compare(data.password,row.password_hash)))throw new UnauthorizedException('Invalid credentials');
  const secret=process.env.JWT_SECRET;
  if(!secret || secret.length<32)throw new Error('JWT_SECRET must be at least 32 characters');
  const token=jwt.sign({sub:row.id,email:row.email,role:row.role},secret,{expiresIn:8*60*60});
  return {accessToken:token,tokenType:'Bearer',expiresInSeconds:8*60*60,user:{id:row.id,email:row.email,role:row.role,displayName:row.display_name}};
 }
}
@Controller('auth')
export class AuthController {
 constructor(private readonly service:AuthService){}
 @Post('register') register(@Body() b:any){return this.service.register(b||{});}
 @Post('login') login(@Body() b:any){return this.service.login(b||{});}
 @UseGuards(AuthGuard) @Get('me') me(@CurrentUser() user:AuthUser){return user;}
}
