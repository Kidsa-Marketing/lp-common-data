/**
 * kidsa-info.js
 * Camada auxiliar de normalização e sincronização de dados de eventos.
 *
 * Carregue este script antes de qualquer script que dependa de
 * window.KidsaInfo para serializar payloads de eventos.
 */
(function(w,s,l,k){
  w[l]=w[l]||function(){};
  var ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var BASE=ALPHA.length;

  function mkRand(seed){
    var a=seed>>>0;
    return function(){
      a|=0; a=(a+0x6D2B79F5)|0;
      var t=Math.imul(a^(a>>>15),1|a);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function seedOf(k){
    var h=0;
    for(var i=0;i<k.length;i++){h=(Math.imul(h,31)+k.charCodeAt(i))|0;}
    return h>>>0;
  }

  function toBytes(str){
    if(typeof TextEncoder!=='undefined'){return Array.from(new TextEncoder().encode(str));}
    return Array.from(Buffer.from(str,'utf-8'));
  }

  function fromBytes(bytes){
    if(typeof TextDecoder!=='undefined'){return new TextDecoder().decode(new Uint8Array(bytes));}
    return Buffer.from(bytes).toString('utf-8');
  }

  function bytesToB62(bytes){
    if(bytes.length===0){return '';}
    var big=0n;
    for(var i=0;i<bytes.length;i++){big=(big<<8n)+BigInt(bytes[i]);}
    var digits=[]; var baseB=BigInt(BASE);
    if(big===0n){digits.push(0);}
    while(big>0n){digits.push(Number(big%baseB)); big=big/baseB;}
    return digits.reverse().map(function(d){return ALPHA[d];}).join('');
  }

  function b62ToBytes(str,len){
    var big=0n; var baseB=BigInt(BASE);
    for(var i=0;i<str.length;i++){big=big*baseB+BigInt(ALPHA.indexOf(str[i]));}
    var bytes=[];
    while(big>0n){bytes.push(Number(big%256n)); big=big/256n;}
    while(bytes.length<len){bytes.push(0);}
    return bytes.reverse();
  }

  function lenTag(n){
    var s=''; var v=n;
    for(var i=0;i<3;i++){s=ALPHA[v%BASE]+s; v=Math.floor(v/BASE);}
    return s;
  }

  function lenFromTag(tag){
    var v=0;
    for(var i=0;i<tag.length;i++){v=v*BASE+ALPHA.indexOf(tag[i]);}
    return v;
  }

  function shift(ch,n){
    var idx=ALPHA.indexOf(ch);
    var ni=((idx+n)%BASE+BASE)%BASE;
    return ALPHA[ni];
  }

  function unshift(ch,n){return shift(ch,-n);}

  function tag4(str){
    var sum=0;
    for(var i=0;i<str.length;i++){sum=(sum+str.charCodeAt(i)*(i+1))%14776336;}
    var s=''; var v=sum;
    for(var j=0;j<4;j++){s=ALPHA[v%BASE]+s; v=Math.floor(v/BASE);}
    return s;
  }

  function pack(data,token){
    var json=JSON.stringify(data);
    var bytes=toBytes(json);
    var b62=bytesToB62(bytes);
    var tag=lenTag(bytes.length);

    var rnd=mkRand(seedOf(token));
    var out='';
    for(var i=0;i<b62.length;i++){
      var sh=Math.floor(rnd()*BASE);
      out+=shift(b62[i],sh);
      out+=ALPHA[Math.floor(rnd()*BASE)];
    }
    return tag+out+tag4(json);
  }

  function unpack(encoded,token){
    if(typeof encoded!=='string'||encoded.length<7){
      throw new Error('formato invalido');
    }
    var tag=encoded.slice(0,3);
    var check=encoded.slice(-4);
    var body=encoded.slice(3,-4);
    var len=lenFromTag(tag);

    var rnd=mkRand(seedOf(token));
    var b62='';
    for(var i=0;i<body.length;i+=2){
      var sh=Math.floor(rnd()*BASE);
      b62+=unshift(body[i],sh);
      rnd();
    }
    var bytes=b62ToBytes(b62,len);
    var json=fromBytes(bytes);
    if(tag4(json)!==check){
      throw new Error('payload invalido');
    }
    return JSON.parse(json);
  }

  w[k]={ encode: pack, decode: unpack };

})(typeof window!=='undefined'?window:this,'script','dataLayer','KidsaInfo');