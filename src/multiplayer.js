// Two-player real-time peer-to-peer rooms. Signalling uses the public PeerJS service.
// No accounts or persistent player data. Host must remain connected.
const HOST_PREFIX='road-rush-room-';
const normalize = value => String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
export function createMultiplayer(onRemote,onStatus) {
  let peer=null, connection=null, host=false, room='', active=false;
  function status(message){onStatus(message);}
  async function loadPeer() {
    const mod=await import('https://esm.sh/peerjs@1.5.5');
    return mod.Peer;
  }
  function wire(conn) {
    if(connection?.open) {conn.close();return;}
    connection=conn;
    conn.on('open',()=>{active=true;status('Connected · Room '+room);});
    conn.on('data',data=>{
      if(!data||typeof data!=='object')return;
      if(data.type==='position'&&Number.isFinite(data.x)&&Number.isFinite(data.y)&&Number.isFinite(data.z)) onRemote(data);
      if(data.type==='hello')status('Friend joined · Room '+room);
    });
    conn.on('close',()=>{active=false;connection=null;onRemote(null);status('Friend disconnected · Room '+room);});
    conn.on('error',()=>status('Connection interrupted. Try rejoining.'));
  }
  function reset() {
    connection?.close();peer?.destroy();connection=null;peer=null;active=false;onRemote(null);
  }
  return {
    async create(){
      reset();host=true;room=Math.random().toString(36).slice(2,8).toUpperCase();
      status('Creating room…');
      try {
        const Peer=await loadPeer();
        peer=new Peer(HOST_PREFIX+room,{debug:0});
        peer.on('open',()=>status('Room '+room+' · Waiting for a friend'));
        peer.on('connection',conn=>wire(conn));
        peer.on('error',err=>status(err.type==='unavailable-id'?'Room code conflict. Create another.':'Room service unavailable: '+err.type));
        return room;
      } catch {status('Cannot connect to room service. Check internet.');return null;}
    },
    async join(input){
      const code=normalize(input);if(code.length!==6){status('Enter a 6-character room code.');return;}
      reset();host=false;room=code;status('Joining '+code+'…');
      try {
        const Peer=await loadPeer();peer=new Peer(undefined,{debug:0});
        peer.on('open',()=>wire(peer.connect(HOST_PREFIX+room,{reliable:false})));
        peer.on('error',err=>status('Could not join: '+err.type));
      }catch{status('Cannot connect to room service. Check internet.');}
    },
    send(position) {
      if(active&&connection?.open)connection.send({type:'position',...position});
    },
    get room(){return room;},
    get connected(){return active;},
    close(){reset();status('Multiplayer disconnected.');}
  };
}
