import { Module, Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { AuthService, AuthGuard, StaffGuard, AuthController } from './auth/auth';
import { RoomsService, RoomsController } from './rooms/rooms';
import { BookingsService, BookingsController } from './bookings/bookings';
import { StaffService, StaffController } from './staff/staff';
import { StaffPlansService, StaffPlansController } from './staff/plans';
import { EventsService, EventsController } from './events/events';
import { EventApprovalService, StaffEventApprovalController, GmEventApprovalController } from './events/approval';
import { AgentToolRegistry, AgentService } from './agent/agent';
import { EnquiriesService, PublicEnquiriesController, StaffEnquiriesController } from './enquiries/enquiries';
import { isStrongJwtConfigured } from './shared/frontdesk-contract';
import { OPENAPI_DOCUMENT } from './generated/openapi-m9';
import { API_RELEASE } from './shared/release';
@Controller()
class HealthController {
 constructor(private readonly db:DatabaseService){}
 @Get() index(){return {service:'EstateFlow API',version:API_RELEASE,message:'Backend JSON API — the Lovable guest and staff frontend is a separate application.',routes:{liveness:'/health',readiness:'/health/ready',openapi:'/openapi.json',accommodations:'/room-types'}};}
 @Get('openapi.json') openapi(){return OPENAPI_DOCUMENT;}
 @Get('health') health(){return {status:'ok',service:'EstateFlow API',version:API_RELEASE,environment:process.env.NODE_ENV==='test'?'test':process.env.NODE_ENV==='production'?'production':'development'};}
 @Get('health/ready') async ready(){
  try {
   if(!isStrongJwtConfigured(process.env.JWT_SECRET))throw new Error('JWT configuration invalid');
   await this.db.query('SELECT 1 AS ready');
   return {status:'ready',database:'reachable',agent:'loaded',version:API_RELEASE};
  } catch {throw new ServiceUnavailableException({status:'unavailable',message:'Service dependency check failed'});}
 }
}
@Module({
 controllers:[HealthController,AuthController,RoomsController,BookingsController,StaffController,StaffPlansController,EventsController,StaffEventApprovalController,GmEventApprovalController,PublicEnquiriesController,StaffEnquiriesController],
 providers:[DatabaseService,AuthService,AuthGuard,StaffGuard,RoomsService,BookingsService,StaffService,StaffPlansService,EventsService,EventApprovalService,AgentToolRegistry,AgentService,EnquiriesService]
})
export class AppModule {}
