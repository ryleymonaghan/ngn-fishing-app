import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, PanResponder, Dimensions, Modal, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/index';

const { width: SCREEN_W } = Dimensions.get('window');

const HOTSPOTS = [
  { id: 'breach-inlet-south', name: 'Breach Inlet — South Rip', shortName: 'Breach Inlet', lat: 32.7883, lng: -79.8231, depthFt: 6, type: 'Inlet Edge', tidePreference: ['incoming'], confirmedSightings: 12, notes: 'Inlet feeds with incoming — massive schools funnel through. Tarpon and cobia show here May–Sept.', predators: ['Tarpon', 'Cobia', 'Redfish', 'Spanish Mackerel'], accessType: 'Boat only', warning: 'Strong current — anchor well or drift.' },
  { id: 'stono-creek-mouth', name: 'Stono River — Penny Creek Mouth', shortName: 'Penny Creek', lat: 32.6901, lng: -80.0378, depthFt: 4, type: 'Creek Mouth', tidePreference: ['incoming'], confirmedSightings: 8, notes: 'Best on incoming — pogies pour in with the tide. Redfish and flounder stack behind them.', predators: ['Redfish', 'Flounder', 'Black Drum'], accessType: 'Boat', warning: null },
  { id: 'wappoo-cut-east', name: 'Wappoo Cut — East End Flat', shortName: 'Wappoo Cut', lat: 32.7456, lng: -79.9821, depthFt: 3, type: 'Flat / Channel Edge', tidePreference: ['incoming', 'slack'], confirmedSightings: 5, notes: 'Shallow flat with hard bottom. Schools push in on incoming, blow up at high slack.', predators: ['Redfish', 'Speckled Trout', 'Flounder'], accessType: 'Boat / Kayak', warning: 'Heavy boat traffic on weekends.' },
  { id: 'ashley-river-bridge', name: 'Ashley River — Bridge Pilings', shortName: 'Ashley Bridge', lat: 32.7621, lng: -79.9804, depthFt: 8, type: 'Structure', tidePreference: ['incoming', 'outgoing'], confirmedSightings: 6, notes: 'Structure holds schools during current push both ways. Sheepshead and drum stack on pilings.', predators: ['Sheepshead', 'Black Drum', 'Redfish'], accessType: 'Boat', warning: 'No wake zone.' },
  { id: 'folly-river-bend', name: 'Folly River — North Bend', shortName: 'Folly Bend', lat: 32.6672, lng: -79.9445, depthFt: 5, type: 'River Bend', tidePreference: ['outgoing'], confirmedSightings: 4, notes: 'Produces on outgoing as schools get pushed down the bend toward the inlet.', predators: ['Redfish', 'Flounder'], accessType: 'Boat / Kayak', warning: 'Shallow at low tide — draft < 2ft.' },
  { id: 'north-edisto-sandbars', name: 'North Edisto — Otter Island Bars', shortName: 'Otter Island', lat: 32.4912, lng: -80.3201, depthFt: 2, type: 'Sandbar', tidePreference: ['incoming'], confirmedSightings: 3, notes: 'Remote but productive. Schools push onto bars at high water.', predators: ['Redfish', 'Cobia', 'Tarpon'], accessType: 'Boat + Kayak', warning: 'Remote — 45 min from marina. No cell service.' },
  { id: 'charleston-harbor-drummond', name: 'Charleston Harbor — Drummond Point', shortName: 'Drummond Pt', lat: 32.7712, lng: -79.9398, depthFt: 3, type: 'Harbor Flat', tidePreference: ['incoming', 'slack'], confirmedSightings: 4, notes: 'Visible from the harbor on calm mornings. Productive year-round on warm days.', predators: ['Redfish', 'Speckled Trout', 'Black Drum'], accessType: 'Boat / Kayak', warning: 'Commercial shipping in channel — stay clear.' },
  { id: 'stono-inlet-north', name: 'Stono Inlet — North Channel', shortName: 'Stono Inlet', lat: 32.6443, lng: -80.0891, depthFt: 10, type: 'Inlet Edge', tidePreference: ['incoming'], confirmedSightings: 2, notes: 'Offshore schools push in through inlet on incoming. Best June–Oct for large pogies.', predators: ['Cobia', 'King Mackerel', 'Tarpon'], accessType: 'Boat only', warning: 'Exposed inlet — check forecast before leaving dock.' },
] as const;

function scoreTide(phase: string, h: number) { if(phase==='incoming'){if(h>=1&&h<=3)return 100;if(h>=0&&h<1)return 80;if(h>3&&h<=5)return 60;return 40;}if(phase==='slack')return 50;if(phase==='outgoing')return(6-h)<=2?45:25;return 0; }
function scoreWind(s: number) { return s<=5?100:s<=8?85:s<=12?65:s<=15?40:s<=20?20:5; }
function scoreSeason(m: number) { const t:Record<number,number>={1:5,2:10,3:40,4:65,5:85,6:95,7:100,8:100,9:95,10:80,11:50,12:15};return t[m]??0; }
function scoreTime(h: number) { return h>=5&&h<=8?100:h>=17&&h<=20?90:h>=8&&h<=10?75:h>=15&&h<=17?70:h>=10&&h<=15?45:20; }
function computeScore(spot: typeof HOTSPOTS[number], phase: string, hth: number, wind: number, hour: number, month: number) { const tm=spot.tidePreference.includes(phase as never);const ts=tm?scoreTide(phase,hth):scoreTide(phase,hth)*0.4;return Math.min(100,Math.round(ts*0.35+scoreWind(wind)*0.20+scoreSeason(month)*0.15+scoreTime(hour)*0.15+Math.min(20,spot.confirmedSightings*1.5)*0.15)); }
function getTier(score: number) { if(score>=80)return{label:'PRIME',color:COLORS.success,bg:'#2ECC7122'};if(score>=65)return{label:'GOOD',color:COLORS.warning,bg:'#F39C1222'};if(score>=45)return{label:'FAIR',color:COLORS.seafoam,bg:'#4ECDC422'};return{label:'POOR',color:COLORS.textMuted,bg:'#6B8FA822'}; }
function buildReasons(spot: typeof HOTSPOTS[number], phase: string, hth: number, wind: number, hour: number) { const lines:string[]=[];const tm=spot.tidePreference.includes(phase as never);if(tm&&phase==='incoming'&&hth>=1&&hth<=3)lines.push(`Peak incoming — ${hth.toFixed(1)} hrs to high. Schools pushing onto ${spot.type.toLowerCase()}.`);else if(tm)lines.push(`Tide (${phase}) matches this spot's productive window.`);else lines.push(`Tide (${phase}) isn't ideal — schools may be off this structure.`);if(wind<=8)lines.push(`Wind ${wind} kts — calm. Surface schools visible, net throws clean.`);else if(wind<=14)lines.push(`Wind ${wind} kts — moderate. Schools may be slightly sub-surface.`);else lines.push(`Wind ${wind} kts — schools pushed down, cast net will struggle.`);if(hour>=5&&hour<=9)lines.push('Dawn window — low light drives surface feeding.');else if(hour>=17&&hour<=20)lines.push('Dusk window — second surface activity peak.');else if(hour>=10&&hour<=15)lines.push('Midday — schools likely sub-surface. Lead your net deeper.');lines.push(`${spot.confirmedSightings} confirmed sightings logged here.`);return lines; }
function getConditions(hour: number) { const h=hour%24;const hth=((( h<=12?12-h:36-h)%12)+12)%12;let phase='slack';if(hth>=1&&hth<=5)phase='incoming';else if(hth>=5&&hth<5.5)phase='outgoing';return{tidePhase:phase,hoursToHigh:hth,windSpeed:Math.round(8+Math.sin((h/24)*Math.PI*2)*3),hour:h,month:new Date().getMonth()+1}; }
function fmt(h: number) { const hr=Math.floor(h)%24;const m=Math.round((h%1)*60);return`${hr%12===0?12:hr%12}:${String(m).padStart(2,'0')} ${hr>=12?'PM':'AM'}`; }
function tideColor(p: string) { return p==='incoming'?COLORS.success:p==='slack'?COLORS.warning:COLORS.textMuted; }

export default function SpotsScreen() {
  const now = new Date();
  const [hour, setHour] = useState(now.getHours()+now.getMinutes()/60);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [showModal, setShowModal] = useState(false);
  const cond = getConditions(hour);
  const spots = [...HOTSPOTS].map(s=>({...s,score:computeScore(s,cond.tidePhase,cond.hoursToHigh,cond.windSpeed,cond.hour,cond.month),tier:getTier(computeScore(s,cond.tidePhase,cond.hoursToHigh,cond.windSpeed,cond.hour,cond.month)),reasons:buildReasons(s,cond.tidePhase,cond.hoursToHigh,cond.windSpeed,cond.hour)})).sort((a,b)=>b.score-a.score);
  const sel = selectedId ? spots.find(s=>s.id===selectedId) : null;
  const pan = useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderMove:(_,gs)=>setHour(Math.max(0,Math.min(23.99,(gs.moveX/(SCREEN_W-32))*24)))})).current;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.timeline}>
        <View style={s.tlHeader}>
          <Text style={s.tlLabel}>MENHADEN INTEL</Text>
          <View style={s.pill}><View style={[s.dot,{backgroundColor:tideColor(cond.tidePhase)}]}/><Text style={s.pillText}>{cond.tidePhase.toUpperCase()} · {cond.windSpeed} KTS · {fmt(hour)}</Text></View>
        </View>
        <View style={s.phaseBar}>{Array.from({length:48},(_,i)=>{const c=getConditions(i*0.5);return <View key={i} style={[s.phaseSeg,{backgroundColor:tideColor(c.tidePhase)}]}/>;})}</View>
        <View style={s.sliderTrack} {...pan.panHandlers}>
          <View style={[s.sliderFill,{width:`${(hour/24)*100}%`}]}/>
          <View style={[s.sliderThumb,{left:`${(hour/24)*100}%`}]}/>
        </View>
        <View style={s.sliderLabels}><Text style={s.edge}>12 AM</Text><Text style={s.edge}>11 PM</Text></View>
        <View style={s.legend}>
          {[['incoming',COLORS.success,'INCOMING'],['slack',COLORS.warning,'SLACK'],['outgoing',COLORS.textMuted,'OUTGOING']].map(([,c,l])=>(
            <View key={l as string} style={s.legItem}><View style={[s.legDot,{backgroundColor:c as string}]}/><Text style={s.legText}>{l as string}</Text></View>
          ))}
        </View>
      </View>

      <MapView style={s.map} initialRegion={{latitude:32.68,longitude:-79.99,latitudeDelta:0.42,longitudeDelta:0.52}} mapType="satellite" onPress={()=>setSelectedId(null)}>
        {spots.map(spot=>(
          <Marker key={spot.id} coordinate={{latitude:spot.lat,longitude:spot.lng}} onPress={()=>{setSelectedId(spot.id);setShowModal(true);}} anchor={{x:0.5,y:0.5}}>
            <View style={[s.pin,{borderColor:spot.tier.color,backgroundColor:selectedId===spot.id?spot.tier.color:COLORS.navy,transform:[{scale:selectedId===spot.id?1.3:1}]}]}>
              <Text style={[s.pinText,{color:selectedId===spot.id?COLORS.navy:spot.tier.color}]}>{spot.score}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={s.listWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listScroll}>
          {spots.map(spot=>(
            <TouchableOpacity key={spot.id} style={[s.card,{borderColor:selectedId===spot.id?spot.tier.color:`${spot.tier.color}33`,backgroundColor:selectedId===spot.id?spot.tier.bg:COLORS.navyLight}]} onPress={()=>{setSelectedId(spot.id);setShowModal(true);}} activeOpacity={0.8}>
              <View style={[s.badge,{backgroundColor:spot.tier.color}]}><Text style={s.badgeText}>{spot.score}</Text></View>
              <Text style={[s.cardTier,{color:spot.tier.color}]}>{spot.tier.label}</Text>
              <Text style={s.cardName} numberOfLines={1}>{spot.shortName}</Text>
              <Text style={s.cardSub}>{spot.depthFt}FT · {spot.confirmedSightings} LOGS</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Modal visible={showModal&&!!sel} animationType="slide" transparent onRequestClose={()=>setShowModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            {sel&&(<>
              <View style={s.handle}/>
              <View style={s.mHeader}>
                <View style={[s.tierBadge,{backgroundColor:sel.tier.bg,borderColor:`${sel.tier.color}55`}]}><Text style={[s.tierText,{color:sel.tier.color}]}>{sel.tier.label} · {sel.score}/100</Text></View>
                <TouchableOpacity onPress={()=>setShowModal(false)}><Text style={s.closeX}>✕</Text></TouchableOpacity>
              </View>
              <Text style={s.mTitle}>{sel.name}</Text>
              <Text style={s.mMeta}>{sel.depthFt}FT · {sel.type.toUpperCase()} · {sel.accessType.toUpperCase()}</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.secLabel}>WHY MENHADEN ARE HERE NOW</Text>
                {sel.reasons.map((r,i)=>(<View key={i} style={s.reasonRow}><View style={[s.reasonBar,{backgroundColor:sel.tier.color}]}/><Text style={s.reasonText}>{r}</Text></View>))}
                <Text style={s.secLabel}>PREDATORS FOLLOWING</Text>
                <View style={s.tagRow}>{sel.predators.map(p=>(<View key={p} style={s.tag}><Text style={s.tagText}>{p}</Text></View>))}</View>
                <Text style={s.secLabel}>LOCAL KNOWLEDGE</Text>
                <Text style={s.notes}>{sel.notes}</Text>
                {sel.warning&&<View style={s.warnBox}><Text style={s.warnText}>⚠  {sel.warning}</Text></View>}
                <Text style={s.gps}>GPS: {sel.lat.toFixed(4)}, {sel.lng.toFixed(4)}</Text>
                <View style={{height:32}}/>
              </ScrollView>
            </>)}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.navy},
  timeline:{backgroundColor:COLORS.navy,paddingHorizontal:16,paddingTop:10,paddingBottom:8,borderBottomWidth:1,borderBottomColor:'#0E356088'},
  tlHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  tlLabel:{fontSize:11,fontWeight:'700',color:COLORS.seafoam,letterSpacing:2},
  pill:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.navyLight,paddingHorizontal:8,paddingVertical:3,borderRadius:12,gap:5},
  dot:{width:6,height:6,borderRadius:3},
  pillText:{fontSize:9,color:COLORS.textSecondary,letterSpacing:1},
  phaseBar:{flexDirection:'row',height:4,borderRadius:2,overflow:'hidden',marginBottom:6},
  phaseSeg:{flex:1,opacity:0.6},
  sliderTrack:{height:2,backgroundColor:'#4ECDC433',borderRadius:1,marginBottom:4,position:'relative',justifyContent:'center'},
  sliderFill:{position:'absolute',left:0,height:2,backgroundColor:COLORS.seafoam,borderRadius:1},
  sliderThumb:{position:'absolute',width:14,height:14,borderRadius:7,backgroundColor:COLORS.seafoam,marginLeft:-7,top:-6},
  sliderLabels:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},
  edge:{fontSize:8,color:COLORS.textMuted},
  legend:{flexDirection:'row',gap:14},
  legItem:{flexDirection:'row',alignItems:'center',gap:4},
  legDot:{width:6,height:6,borderRadius:3},
  legText:{fontSize:8,color:COLORS.textMuted,letterSpacing:1},
  map:{flex:1},
  pin:{width:34,height:34,borderRadius:17,borderWidth:2,alignItems:'center',justifyContent:'center'},
  pinText:{fontSize:10,fontWeight:'800'},
  listWrap:{backgroundColor:COLORS.navy,paddingVertical:10,borderTopWidth:1,borderTopColor:'#0E356088'},
  listScroll:{paddingHorizontal:16,gap:8},
  card:{width:100,padding:10,borderRadius:8,borderWidth:1,alignItems:'center'},
  badge:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',marginBottom:5},
  badgeText:{fontSize:12,fontWeight:'800',color:COLORS.navy},
  cardTier:{fontSize:8,fontWeight:'700',letterSpacing:1,marginBottom:2},
  cardName:{fontSize:9,color:COLORS.white,fontWeight:'600',textAlign:'center',marginBottom:2},
  cardSub:{fontSize:8,color:COLORS.textMuted},
  overlay:{flex:1,backgroundColor:'#00000088',justifyContent:'flex-end'},
  sheet:{backgroundColor:COLORS.navy,borderTopLeftRadius:20,borderTopRightRadius:20,paddingHorizontal:20,paddingTop:12,maxHeight:'80%'},
  handle:{width:36,height:4,backgroundColor:COLORS.textMuted,borderRadius:2,alignSelf:'center',marginBottom:12},
  mHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  tierBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:4,borderWidth:1},
  tierText:{fontSize:11,fontWeight:'700',letterSpacing:1},
  closeX:{color:COLORS.textMuted,fontSize:16,padding:4},
  mTitle:{fontSize:18,fontWeight:'700',color:COLORS.white,marginBottom:4},
  mMeta:{fontSize:10,color:COLORS.seafoam,letterSpacing:1,marginBottom:16},
  secLabel:{fontSize:9,color:COLORS.textMuted,letterSpacing:2,marginBottom:8,marginTop:4},
  reasonRow:{flexDirection:'row',marginBottom:8,gap:8},
  reasonBar:{width:2,borderRadius:1,minHeight:14},
  reasonText:{flex:1,fontSize:12,color:COLORS.textSecondary,lineHeight:18},
  tagRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:16},
  tag:{paddingHorizontal:8,paddingVertical:3,borderRadius:3,borderWidth:1,borderColor:'#4ECDC444',backgroundColor:'#0E356088'},
  tagText:{fontSize:10,color:COLORS.seafoam},
  notes:{fontSize:12,color:COLORS.textSecondary,lineHeight:20,marginBottom:16},
  warnBox:{backgroundColor:'#E74C3C18',borderLeftWidth:2,borderLeftColor:COLORS.danger,padding:10,borderRadius:4,marginBottom:16},
  warnText:{fontSize:11,color:COLORS.danger,lineHeight:16},
  gps:{fontSize:10,color:COLORS.textMuted,fontFamily:Platform.OS==='ios'?'Courier New':'monospace',marginBottom:16},
});
