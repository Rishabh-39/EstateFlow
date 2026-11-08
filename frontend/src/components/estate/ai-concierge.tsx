import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import conciergeImg from "@/assets/ai-concierge.png";
import type { ChatStatus, UIMessage } from "ai";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { http, json } from "@/services/api/http";

const SUGGESTIONS = ["Can the lawn hold 200 guests?", "Weekend dates next spring", "What does a 2-night stay cost?", "Vegetarian catering options"];
const textOf=(m:UIMessage)=>m.parts.filter(p=>p.type==="text").map(p=>p.type==="text"?p.text:"").join("");
const msg=(role:'assistant'|'user',text:string):UIMessage=>({id:nanoid(),role,parts:[{type:'text',text}]});
const welcome: UIMessage={id:'concierge-welcome',role:'assistant',parts:[{type:'text',text:'Hi — I’m the **estate concierge intake**. Share your dates, guests or event needs. I’ll send your enquiry for a reservations team member to review. This chat does not guarantee prices or availability.'}]};

/** Preserve Lovable's original chat UI but never invent capacity, prices or automatic booking approvals. */
export function AiConcierge({className}:{className?:string}) {
 const [messages,setMessages]=useState<UIMessage[]>([welcome]);
 const [status,setStatus]=useState<ChatStatus>('ready');
 const [name,setName]=useState('');const [email,setEmail]=useState('');
 const [reference,setReference]=useState<string|null>(null);
 const [greeted,setGreeted]=useState(false);
 const sessionRef=useRef<string|null>(null);
 const boxRef=useRef<HTMLDivElement>(null);
 const focusComposer=()=>boxRef.current?.querySelector('textarea')?.focus({preventScroll:true});
 useEffect(()=>{focusComposer();},[]);
 const send=async(raw:string)=>{
  const text=raw.trim();if(!text||status!=='ready')return;
  if(name.trim().length<2){setMessages(m=>[...m,msg('assistant','Please enter your name below before submitting your enquiry.')]);return;}
  if(email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setMessages(m=>[...m,msg('assistant','Please enter a valid email address, or leave it empty.')]);return;}
  setMessages(m=>[...m,msg('user',text)]);setStatus('submitted');
  // A browser-session UUID identifies one continuing enquiry, not one model token per message.
  // Never expose an identity from another guest/browser. Session lifetime ends with the tab.
  if(!sessionRef.current){
   const saved=typeof window!=='undefined'?window.sessionStorage.getItem('estateflow-concierge-session'):null;
   const savedName=typeof window!=='undefined'?window.sessionStorage.getItem('estateflow-concierge-name'):null;
   sessionRef.current=saved && savedName===name.trim().toLowerCase()?saved:crypto.randomUUID();
  }
  try {
   const result=await http<{public_ref:string;conversationId:string;quickReply?:string}>('/enquiries',json({contactName:name.trim(),contactEmail:email.trim()||undefined,message:text,concierge:true,conversationId:sessionRef.current}));
   if(typeof window!=='undefined'){
    window.sessionStorage.setItem('estateflow-concierge-session',sessionRef.current!);
    window.sessionStorage.setItem('estateflow-concierge-name',name.trim().toLowerCase());
   }
   const first=!reference && !greeted;
   setReference(result.public_ref);
   setGreeted(true);
   const initialGuidance=msg('assistant','*Preparing a tailored response…*');
   const guidanceId=initialGuidance.id;
   setMessages(m=>[...m,
     msg('assistant',`${first?`Welcome, **${name.trim()}**! `:''}Your message has been saved under enquiry **${result.public_ref}**. Our team will review this conversation; no reservation has been made.`),
     initialGuidance,
   ]);
   // Let the guest keep using the UI while optional local Qwen drafts an informational answer.
   setStatus('ready');
   void http<{conciergeReply:string;conciergeMode:string}>('/enquiries/chat/advisory',json({conversationId:sessionRef.current,message:text}))
    .then(reply=>setMessages(m=>m.map(item=>item.id===guidanceId
      ?{...item,parts:[{type:'text' as const,text:`${reply.conciergeReply}\n\n*Information only; staff must verify availability and approve bookings.*`}]}:item)))
    .catch(()=>setMessages(m=>m.map(item=>item.id===guidanceId?{...item,parts:[{type:'text' as const,text:'A tailored AI response is unavailable right now. Your enquiry is saved for staff review; the team will verify details before replying.'}]}:item)));
  }catch(e){setMessages(m=>[...m,msg('assistant',`We couldn't confirm the save: ${(e as Error).message}. Check your connection and the staff inbox before retrying to avoid duplicate messages.`)]);}
  finally {setStatus('ready');focusComposer();}

 };
 return <section ref={boxRef} aria-label="Ask the estate concierge" className={cn('panel fade-up overflow-hidden shadow-soft',className)}>
  <header className="flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-4">
   <img src={conciergeImg} alt="" width={816} height={816} loading="lazy" className="size-10 shrink-0 rounded-full object-cover ring-1 ring-border"/>
   <div className="min-w-0"><p className="font-display text-base font-semibold text-foreground">Estate concierge</p><p className="text-xs text-muted-foreground">Ask about the resort · Informational suggestions only; staff verify bookings and capacity</p></div>
  </header>
  <Conversation className="h-72"><ConversationContent className="gap-5 p-5">
   {messages.map(m=><Message key={m.id} from={m.role}><MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">{m.role==='assistant'?<MessageResponse>{textOf(m)}</MessageResponse>:textOf(m)}</MessageContent></Message>)}
   {status==='submitted'&&<Message from="assistant"><MessageContent><Shimmer as="span" duration={1.4}>Submitting to the reservations team…</Shimmer></MessageContent></Message>}
  </ConversationContent><ConversationScrollButton/></Conversation>
  <div className="border-t border-border px-4 pt-3">
   <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><Input aria-label="Your name" placeholder="Your name (required)" minLength={2} maxLength={100} value={name} disabled={Boolean(reference)} onBlur={()=>{if(!greeted&&name.trim().length>=2){setGreeted(true);setMessages(m=>[...m,msg('assistant',`Welcome, **${name.trim()}**! How can I help you plan your estate visit or event?`)]);}}} onChange={e=>setName(e.target.value)}/><Input aria-label="Your email" type="email" placeholder="Email for response (optional)" value={email} disabled={Boolean(reference)} onChange={e=>setEmail(e.target.value)}/></div>
   <div className="flex flex-wrap gap-2 pb-3">{SUGGESTIONS.map(s=><button key={s} type="button" onClick={()=>{void send(s);}} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">{s}</button>)}</div>
   <PromptInput className="mb-3" onSubmit={({text})=>{void send(text);}}><PromptInputTextarea aria-label="Message the estate concierge" placeholder="Ask about dates, guests, rooms, dining or budget…"/><PromptInputFooter className="justify-end"><PromptInputSubmit status={status} disabled={status!=='ready'}/></PromptInputFooter></PromptInput>
  </div>
 </section>;
}
