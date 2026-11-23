import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

// This is an original, Superhuman-inspired productivity shell: not a copy of its proprietary UI or assets.
WebBrowser.maybeCompleteAuthSession();

type MailMessage = { id: string; threadId: string; sender: string; subject: string; snippet: string; date: string; unread: boolean };
const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const redirectUri = makeRedirectUri({ scheme: 'aurora-mail' });

async function gmailRequest(path: string, token: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(response.status === 401 ? 'Session expired. Connect again.' : `Gmail API error (${response.status})`);
  return response.json();
}

async function loadInbox(token: string): Promise<MailMessage[]> {
  const list = await gmailRequest('messages?maxResults=30&labelIds=INBOX', token);
  return Promise.all((list.messages ?? []).map(async (item: { id: string; threadId: string }) => {
    const data = await gmailRequest(`messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, token);
    const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
    const header = (name: string) => headers.find(h => h.name.toLower === name.toLowerCase())?.value ?? '';
    return { id: item.id, threadId: item.threadId, sender: header('From').replace(/<[^>]*>/g, '').trim(), subject: header('Subject') || '(no subject)', snippet: data.snippet ?? '', date: header('Date'), unread: (data.labelIds ?? []).includes('UNREAD') };
  }));
}

const nav = [
  ['mail-outline', 'Inbox'], ['star-outline', 'Starred'], ['time-outline', 'Snoozed'], ['send-outline', 'Sent'], ['document-text-outline', 'Drafts'], ['archive-outline', 'Archive'],
];

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [request, response, promptAsync] = Google.useAuthRequest({ iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, scopes: [GMAIL_READONLY], redirectUri });
  const [token, setToken] = useState<string | null>(null);
  const [mail, setMail] = useState<MailMessage[]>([]);
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [query, setQuery] = useState('');
  const [palette, setPalette] = useState(false);
  const [reading, setReading] = useState(false);

  const syncInbox = useCallback(async (accessToken: string) => {
    setBusy(true); setError('');
    try {
      const [profile, inbox] = await Promise.all([gmailRequest('profile', accessToken), loadInbox(accessToken)]);
      setAccount(profile.emailAddress ?? 'Gmail'); setMail(inbox); if (!selected && inbox[0]) setSelected(inbox[0]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load Gmail'); }
    finally { setBusy(false); }
  }, [selected]);

  useEffect(() => {
    if (response?.type === 'success') { const accessToken = response.authentication?.accessToken; if (accessToken) { setToken(accessToken); void syncInbox(accessToken); } }
  }, [response, syncInbox]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? mail.filter(m => `${m.sender} ${m.subject} ${m.snippet}`.toLowerCase().includes(q)) : mail;
  }, [mail, query]);

  const openPalette = () => setPalette(true);
  const connect = async () => { try { await promptAsync(); } catch { setError('Could not open sign-in'); } };
  const disconnect = () => { setToken(null); setMail([]); setSelected(null); setAccount(''); setReading(false); };

  if (!token) return <SafeAreaView style={s.root}><StatusBar barStyle="light-content" /><View style={s.connectShell}><View style={s.brandLarge}><View style={s.logo}><Text style={s.logoText}>A</Text></View><Text style={s.wordmark}>AURORA</Text></View><View style={s.connectCard}><Text style={s.kicker}>EMAIL, WITHOUT THE WAIT</Text><Text style={s.hero}>Achieve inbox zero.</Text><Text style={s.heroCopy}>A fast, focused workspace for your most important mail.</Text><Pressable style={s.primary} onPress={() => void connect()} disabled={!request}><Ionicons name="logo-google" size={20} color="#15171b"/><Text style={s.primaryText}>Continue with Google</Text></Pressable>{error ? <Text style={s.error}>{error}</Text> : null}</View></View></SafeAreaView>;

  return <SafeAreaView style={s.root}><StatusBar barStyle="light-content" />
    <View style={s.appShell}>
      {!compact && <View style={s.sidebar}><View style={s.brandRow}><View style={s.logoSmall}><Text style={s.logoTextSmall}>A</Text></View><Text style={s.brandName}>AURORA</Text></View><Pressable style={s.compose}><Ionicons name="create-outline" size={17} color="#15171b"/><Text style={s.composeText}>Compose</Text><Text style={s.key}>C</Text></Pressable><View style={s.nav}>{nav.map(([icon, label], i) => <Pressable key={label} style={[s.navItem, i === 0 && s.navActive]}><Ionicons name={icon as any} size={17} color={i === 0 ? '#eef0ed' : '#8c919b'} /><Text style={[s.navText, i === 0 && s.navTextActive]}>{label}</Text>{i === 0 && <View style={s.count}><Text style={s.countText}>{mail.length}</Text></View>}</Pressable>)}</View><Pressable style={s.account} onPress={disconnect}><View style={s.avatar}><Text style={s.avatarText}>{account.slice(0, 1).toUpper}</Text></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.accountName}>{account}</Text><Text style={s.accountStatus}>Synced</Text></View><Ionicons name="ellipsis-horizontal" size={17} color="#7d828d" /></Pressable></View>}
      <View style={s.workspace}>
        <View style={s.toolbar}><Pressable style={s.search} onPress={openPalette}><Ionicons name="search" size={17} color="#888d97" /><Text style={s.searchPlaceholder}>Search mail</Text><View style={s.shortcut}><Text style={s.shortcutText}>⌘ K</Text></View></Pressable><View style={s.toolbarRight}><Pressable style={s.iconButton} onPress={() => void syncInbox(token)}><Ionicons name="refresh-outline" size={18} color="#b8bbc2" /></Pressable><View style={s.syncIndicator}><View style={s.onlineDot}/><Text style={s.syncText}>Synced</Text></View></View></View>
        {error ? <Text style={s.errorBar}>{error}</Text> : null}
        <View style={[s.content, reading && compact && s.contentReading]}>
          {(!reading || !compact) && <View style={[s.inboxPane, compact && s.inboxPaneFull]}><View style={s.inboxTitleRow}><Text style={s.inboxTitle}>Inbox</Text><Text style={s.inboxMeta}>{filtered.length} conversations</Text></View>{busy && !filtered.length ? <ActivityIndicator color="#6f7cff" style={{ marginTop: 40 }} /> : <FlatList removeClippedSubviews windowSize={7} maxToRenderPerBatch={8} updateCellsBatchingPeriod={16} initialNumToRender={12} data={filtered} keyExtractor={m => m.id} renderItem={({ item }) => { const active = selected?.id === item.id; return <Pressable onPress={() => { setSelected(item); setReading(true); }} style={[s.row, active && s.rowActive]}><View style={[s.unreadDot, item.unread && s.unreadDotOn]} /><View style={s.rowBody}><View style={s.rowTop}><Text numberOfLines={1} style={[s.sender, item.unread && s.senderUnread]}>{item.sender || '(Unknown sender)'}</Text><Text style={s.date}>{item.date ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</Text></View><Text numberOfLines={1} style={[s.subject, item.unread && s.subjectUnread]}>{item.subject}</Text><Text numberOfLines={1} style={s.snippet}>{item.snippet}</Text></View></Pressable>; }} />}</View>}
          {(!compact || reading) && selected && <View style={s.reader}><View style={s.readerBar}><Pressable style={s.readerAction} onPress={() => compact ? setReading(false) : setSelected(null)}><Ionicons name={compact ? 'chevron-back' : 'close'} size={20} color="#a8adb7" /></Pressable><View style={s.readerActions}><Pressable style={s.readerAction}><Ionicons name="archive-outline" size={18} color="#a8adb7" /></Pressable><Pressable style={s.readerAction}><Ionicons name="time-outline" size={18} color="#a8adb7" /></Pressable><Pressable style={s.readerAction}><Ionicons name="ellipsis-horizontal" size={18} color="#a8adb7" /></Pressable></View></View><View style={s.message}><Text style={s.messageSubject}>{selected.subject}</Text><View style={s.senderRow}><View style={s.messageAvatar}><Text style={s.messageAvatarText}>{selected.sender.slice(0,1).toUpper}</Text></View><View style={{ flex: 1 }}><Text style={s.messageSender}>{selected.sender || 'Unknown sender'}</Text><Text style={s.messageRecipient}>to me</Text></View><Text style={s.messageDate}>{selected.date ? new Date(selected.date).toLocaleString([], { hour: 'numeric', minute: '2-digit' }) : ''}</Text></View><Text style={s.messageBody}>{selected.snippet || 'No preview available.'}</Text></View></View>}
        </View>
      </View>
    </View>
    <Modal transparent visible={palette} animationType="fade" onRequestClose={() => setPalette(false)}><Pressable style={s.paletteBackdrop} onPress={() => setPalette(false)}><Pressable style={s.paletteCard} onPress={() => null}><View style={s.paletteSearch}><Ionicons name="search" size={18} color="#8d92a0" /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search mail" placeholderTextColor="#777d88" style={s.paletteInput} /><Pressable onPress={() => setPalette(false)}><Text style={s.escape}>ESC</Text></Pressable></View><View style={s.paletteHint}><Text style={s.paletteHintText}>{filtered.length} results</Text></View></Pressable></Pressable></Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({ root:{flex:1,backgroundColor:'#101116'}, appShell:{flex:1,flexDirection:'row'}, sidebar:{width:220,borderRightWidth:1,borderColor:'#25272f',padding:14,paddingBottom:12}, brandRow:{height:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:6}, logoSmall:{width:27,height:27,borderRadius:8,backgroundColor:'#d8f36a',alignItems:'center',justifyContent:'center'}, logoTextSmall:{fontSize:15,fontWeight:'800',color:'#171918'}, brandName:{color:'#eff0ed',fontSize:12,fontWeight:'800',letterSpacing:2}, compose:{height:42,borderRadius:9,backgroundColor:'#d8f36a',marginTop:10,marginBottom:14,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:8}, composeText:{color:'#15171b',fontWeight:'750',flex:1}, key:{color:'#626a43',fontSize:11,fontWeight:'700'}, nav:{gap:2}, navItem:{height:38,borderRadius:8,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10}, navActive:{backgroundColor:'#24262d'}, navText:{color:'#8c919b',fontSize:13}, navTextActive:{color:'#eff0ed',fontWeight:'650'}, count:{marginLeft:'auto',backgroundColor:'#343740',borderRadius:10,minWidth:21,height:20,alignItems:'center',justifyContent:'center'}, countText:{color:'#cfd2d8',fontSize:10,fontWeight:'700'}, account:{marginTop:'auto',height:50,borderTopWidth:1,borderTopColor:'#25272f',paddingTop:10,flexDirection:'row',alignItems:'center',gap:9}, avatar:{width:31,height:31,borderRadius:16,backgroundColor:'#2c2f37',alignItems:'center',justifyContent:'center'}, avatarText:{color:'#dfe1e5',fontWeight:'700'}, accountName:{color:'#c8cad1',fontSize:11}, accountStatus:{color:'#747985',fontSize:10,marginTop:2}, workspace:{flex:1,minWidth:0}, toolbar:{height:58,borderBottomWidth:1,borderColor:'#25272f',paddingHorizontal:18,alignItems:'center',flexDirection:'row',justifyContent:'space-between'}, search:{width:260,maxWidth:'70%',height:36,borderRadius:9,backgroundColor:'#1a1c22',borderWidth:1,borderColor:'#292b33',flexDirection:'row',alignItems:'center',paddingHorizontal:10,gap:8}, searchPlaceholder:{color:'#777c87',fontSize:13,flex:1}, shortcut:{height:21,paddingHorizontal:6,borderRadius:5,backgroundColor:'#252730',justifyContent:'center'}, shortcutText:{color:'#898d99',fontSize:10}, toolbarRight:{flexDirection:'row',alignItems:'center',gap:12}, iconButton:{width:34,height:34,alignItems:'center',justifyContent:'center'}, syncIndicator:{flexDirection:'row',alignItems:'center',gap:7}, onlineDot:{width:7,height:7,borderRadius:4,backgroundColor:'#86bd65'}, syncText:{color:'#7f8490',fontSize:11}, content:{flex:1,flexDirection:'row'}, contentReading:{flexDirection:'column'}, inboxPane:{width:380,borderRightWidth:1,borderColor:'#25272f'}, inboxPaneFull:{width:'100%',borderRightWidth:0}, inboxTitleRow:{height:67,paddingHorizontal:20,alignItems:'center',flexDirection:'row',justifyContent:'space-between'}, inboxTitle:{color:'#eff0ed',fontSize:18,fontWeight:'720'}, inboxMeta:{color:'#777c87',fontSize:11}, row:{minHeight:98,paddingHorizontal:17,flexDirection:'row',borderTopWidth:1,borderTopColor:'#202229'}, rowActive:{backgroundColor:'#1b1d24'}, unreadDot:{width:6,height:6,borderRadius:3,marginTop:19,marginRight:8,backgroundColor:'transparent'}, unreadDotOn:{backgroundColor:'#7f8cff'}, rowBody:{flex:1,paddingTop:13,minWidth:0}, rowTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, sender:{color:'#aeb2bc',fontSize:12,flex:1,paddingRight:8}, senderUnread:{color:'#f0f1ef',fontWeight:'700'}, date:{color:'#777c87',fontSize:10}, subject:{color:'#b7bac3',fontSize:13,marginTop:6}, subjectUnread:{color:'#eceeea',fontWeight:'680'}, snippet:{color:'#777c87',fontSize:12,marginTop:5}, reader:{flex:1,minWidth:0}, readerBar:{height:52,paddingHorizontal:18,borderBottomWidth:1,borderColor:'#25272f',flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, readerActions:{flexDirection:'row',gap:3}, readerAction:{width:35,height:35,alignItems:'center',justifyContent:'center'}, message:{paddingHorizontal:38,paddingTop:34,maxWidth:820}, messageSubject:{color:'#f0f1ed',fontSize:27,fontWeight:'720',letterSpacing:-0.5}, senderRow:{marginTop:26,flexDirection:'row',alignItems:'center'}, messageAvatar:{width:38,height:38,borderRadius:19,backgroundColor:'#30333c',alignItems:'center',justifyContent:'center',marginRight:11}, messageAvatarText:{color:'#e1e3df',fontWeight:'700'}, messageSender:{color:'#d8dade',fontSize:13,fontWeight:'650'}, messageRecipient:{color:'#777c87',fontSize:11,marginTop:3}, messageDate:{color:'#777c87',fontSize:11}, messageBody:{color:'#b9bcc4',fontSize:15,lineHeight:25,marginTop:30}, connectShell:{flex:1,alignItems:'center',justifyContent:'center'}, brandLarge:{position:'absolute',top:28,left:28,flexDirection:'row',alignItems:'center',gap:10}, logo:{width:32,height:32,borderRadius:9,backgroundColor:'#d8f36a',alignItems:'center',justifyContent:'center'}, logoText:{color:'#171918',fontSize:18,fontWeight:'850'}, wordmark:{color:'#eff0ed',fontSize:13,fontWeight:'800',letterSpacing:2}, connectCard:{width:420,maxWidth:'88%',alignItems:'center'}, kicker:{color:'#7f8cff',fontSize:10,fontWeight:'800',letterSpacing:2,marginBottom:16}, hero:{color:'#f1f2ef',fontSize:42,fontWeight:'750',letterSpacing:-1,textAlign:'center'}, heroCopy:{color:'#999daa',fontSize:15,textAlign:'center',marginTop:12,marginBottom:28}, primary:{height:48,width:'100%',borderRadius:10,backgroundColor:'#d8f36a',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9}, primaryText:{color:'#15171b',fontSize:14,fontWeight:'800'}, error:{color:'#ff9a9a',textAlign:'center',marginTop:14,fontSize:12}, errorBar:{color:'#ff9a9a',fontSize:12,padding:8,textAlign:'center',backgroundColor:'#2d2023'}, paletteBackdrop:{flex:1,backgroundColor:'rgba(5,6,8,.72)',alignItems:'center',paddingTop:110}, paletteCard:{width:560,maxWidth:'90%',borderRadius:12,backgroundColor:'#1a1c22',borderWidth:1,borderColor:'#343741',overflow:'hidden'}, paletteSearch:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:16,gap:10}, paletteInput:{flex:1,color:'#eef0ec',fontSize:16}, escape:{color:'#777c87',fontSize:10,backgroundColor:'#292b33',paddingHorizontal:7,paddingVertical:4,borderRadius:5}, paletteHint:{height:42,borderTopWidth:1,borderColor:'#292b33',justifyContent:'center',paddingHorizontal:16}, paletteHintText:{color:'#777c87',fontSize:11} });
