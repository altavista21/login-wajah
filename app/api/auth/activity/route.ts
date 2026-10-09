import { NextRequest,NextResponse } from "next/server";
import { SESSION_COOKIE,createSessionToken,sessionCookieOptions,verifySessionToken } from "@/lib/session";
export async function POST(request:NextRequest){const token=request.cookies.get(SESSION_COOKIE)?.value;if(!token||!(await verifySessionToken(token))){const res=NextResponse.json({error:"Sesi berakhir."},{status:401});res.cookies.set(SESSION_COOKIE,"",{...sessionCookieOptions(),maxAge:0});return res;}const res=NextResponse.json({ok:true});res.cookies.set(SESSION_COOKIE,await createSessionToken(),sessionCookieOptions());return res;}
