const http=require('http'),{randomUUID}=require('crypto');
const orders=new Map();let seq=0;
const product={id:'synthetic-regina-half',name:'La Regina',price:16,standardPrice:16,clubPrice:14,promoPrice:null,active:true,description:'Pomodoro e fiordilatte — prodotto sintetico',imageUrl:null,categoryId:'half',additions:[],removals:[],variants:[],sortOrder:0};
const category={id:'half',name:'Mezze teglie',key:'half-pizzas',active:true,sortOrder:1,products:[product]};
const config={googleLoginEnabled:false,onlinePaymentEnabled:false,deliveryFee:2,services:{allDisabled:false,delivery:{active:true,label:null},pickup:{active:true,label:null},message:null}};
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;let body={},status=200;const h={'content-type':'application/json','cache-control':'no-store'};
 if(req.method==='POST'&&path==='/web/api/ordini'){
  for await(const _ of req){} // Submitted totals are deliberately ignored.
  const id=randomUUID(),order={id,orderNumber:++seq,orderCode:'T'+seq,status:'CONFIRMED',paymentStatus:'PAID',paymentMethod:'STRIPE',type:'ASPORTO',customerName:'PRIVATE_CUSTOMER_CANARY',address:'PRIVATE_ADDRESS_CANARY',notes:'PRIVATE_NOTE_CANARY',total:18.5,items:[],statusHistory:[],refundedAmountCents:0,automaticRefundStatus:'NONE'};
  orders.set(id,order);body=order;h['set-cookie']=`synthetic_access_${id}=allowed; HttpOnly; SameSite=Lax; Path=/`;
 }else if(path.startsWith('/web/api/ordini/')){
  const id=path.split('/').pop();body=orders.get(id);
  if(!body||!(req.headers.cookie||'').includes(`synthetic_access_${id}=allowed`)){status=404;body={error:'not found'};}
 }else if(path==='/fixture'&&req.method==='POST'){
  let raw='';for await(const b of req)raw+=b;const {id,patch}=JSON.parse(raw);Object.assign(orders.get(id)||{},patch);body={ok:true};
 }else if(path==='/web/api/menu')body={isClubMember:false,categories:[category],promotions:[]};
 else if(path==='/web/api/config')body=config;
 else if(path==='/web/api/auth/session')body={authenticated:false,user:null};
 else if(path.includes('categorie'))body=[category];
 else if(path.includes('prodotti'))body=[product];
 else if(path.includes('promoz'))body=[];
 else if(path.includes('fasce'))body={date:'2026-10-15',slots:[{time:'20:00',start:'20:00',end:'20:30',label:'20:00/20:30',available:true}],closed:false};
 else if(path.includes('ordini'))body=[];
 res.writeHead(status,h);res.end(JSON.stringify(body));
}).listen(45991,'127.0.0.1',()=>console.log('Synthetic backend loopback:45991'));
