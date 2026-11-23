import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

type MailMessage = { id: string; threadId: string; sender: string; subject: string; snippet: string; date: string; unread: boolean };
const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const redirectUri = makeRedirectUri({ scheme: 'aurora-mail' });

async function gmailRequest(path: string, token: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your Google session expired. Connect again to continue.');
    const detail = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${detail.slice(0, 180)}`);
  }
  return response.json();
}

async function loadInbox(token: string): Promise<MailMessage[]> {
  const list = await gmailRequest('messages?maxResults=20&labelIds=INBOX', token);
  const messages = await Promise.all((list.messages ?? []).map(async (item: { id: string; threadId: string }) => {
    const data = await gmailRequest(`messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, token);
    const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
    const header = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
    return { id: item.id, threadId: item.threadId, sender: header('From'), subject: header('Subject') || '(no subject)', snippet: data.snippet ?? '', date: header('Date'), unread: (data.labelIds ?? []).includes('UNREAD') };
  }));
  return messages;
}

export default function App() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: [GMAIL_READONLY],
    redirectUri,
  });
  const [token, setToken] = useState<string | null>(null);
  const [mail, setMail] = useState<MailMessage[]>([]);
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<MailMessage | null>(null);

  const syncInbox = useCallback(async (accessToken: string) => {
    setBusy(true); setError('');
    try {
      const [profile, inbox] = await Promise.all([
        gmailRequest('profile', accessToken),
        loadInbox(accessToken),
      ]);
      setAccount(profile.emailAddress ?? 'Gmail'); setMail(inbox);
      if (!selected && inbox.length) setSelected(inbox[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Gmail.');
    } finally { setBusy(false); }
  }, [selected]);

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) { setToken(accessToken); void syncInbox(accessToken); }
      else setError('Google did not return an access token. Please try connecting again.');
    } else if (response?.type === 'error') setError('Google sign-in failed. Check your OAuth client configuration and try again.');
  }, [response, syncInbox]);

  const connect = async () => { setError(''); try { await promptAsync(); } catch { setError('Could not open Google sign-in. Please try again.'); } };
  const disconnect = () => { setToken(null); setMail([]); setSelected(null); setAccount(''); setError(''); };

  return <SafeAreaView style={s.root}><StatusBar barStyle="light-content"/><View style={s.header}>
    <View style={s.brand}><View style={s.mark}><Text style={s.markText}>A</Text></View><Text style={s.brandText}>AURORA</Text></View>
    <Pressable style={s.headerAction} onPress={() => token ? void syncInbox(token) : void connect()} disabled={!request || busy}>
      {busy ? <ActivityIndicator size="small" color="#d9ff58"/> : <Ionicons name={token ? 'refresh-outline' : 'logo-google'} size={18} color="#d9ff58"/>}
    </Pressable>
  </View>
  {!token ? <View style={s.welcome}><View style={s.heroIcon}><Ionicons name="mail-open-outline" size={30} color="#d9ff58"/></View><Text style={s.title}>Your inbox, in focus.</Text><Text style={s.description}>Connect Gmail to view your latest messages in AURORA. Access is read-only; we never ask for your Google password.</Text><Pressable style={[s.connectButton, (!request || busy) && s.disabled]} onPress={connect} disabled={!request || busy}><Ionicons name="logo-google" size={18} color="#111318"/><Text style={s.connectLabel}>Continue with Google</Text></Pressable><Text style={s.note}>Gmail read-only access · You can disconnect anytime</Text>{error ? <Text style={s.error}>{error}</Text> : null}</View> : <View style={s.content}>
    <View style={s.accountRow}><View style={s.accountInfo}><View style={s.onlineDot}/><View><Text style={s.accountEmail}>{account}</Text><Text style={s.accountCaption}>GMAIL · INBOX</Text></View></View><Pressable onPress={disconnect} style={s.disconnect}><Text style={s.disconnectText}>Disconnect</Text></Pressable></View>
    {error ? <Text style={s.error}>{error}</Text> : null}
    <View style={s.main}>{!selected ? <View style={s.empty}><Text style={s.emptyTitle}>Inbox is empty</Text></View> : <View style={s.reader}><Text style={s.subject}>{selected.subject}</Text><Text style={s.from}>{selected.sender}</Text><Text style={s.date}>{selected.date}</Text><Text style={s.body}>{selected.snippet}</Text></View>}
      <FlatList style={s.list} data={mail} keyExtractor={item => item.id} ListEmptyComponent={busy ? <ActivityIndicator color="#d9ff58" style={{marginTop:30}}/> : null} renderItem={({item}) => <Pressable onPress={() => setSelected(item)} style={[s.row, selected?.id === item.id && s.rowSelected]}><View style={[s.unreadDot, !item.unread && s.readDot]}/><View style={s.messageCopy}><Text numberOfLines={1} style={[s.sender, item.unread && s.bold]}>{item.sender}</Text><Text numberOfLines={1} style={[s.messageSubject, item.unread && s.bold]}>{item.subject}</Text><Text numberOfLines={2} style={s.snippet}>{item.snippet}</Text></View></Pressable>}/>
    </View>
  </View>}
  </SafeAreaView>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#111318'},header:{height:62,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#292c35'},brand:{flexDirection:'row',alignItems:'center',gap:9},mark:{width:28,height:28,borderRadius:8,backgroundColor:'#d9ff58',alignItems:'center',justifyContent:'center'},markText:{color:'#111318',fontSize:15,fontWeight:'900'},brandText:{color:'#f1f2f5',fontWeight:'800',letterSpacing:1.5,fontSize:13},headerAction:{width:40,height:40,alignItems:'center',justifyContent:'center'},welcome:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:30},heroIcon:{width:62,height:62,borderRadius:20,backgroundColor:'#252830',alignItems:'center',justifyContent:'center',marginBottom:24},title:{color:'#f1f2f5',fontSize:27,fontWeight:'800',textAlign:'center'},description:{color:'#aeb2bd',fontSize:15,lineHeight:23,textAlign:'center',maxWidth:440,marginTop:12},connectButton:{height:48,paddingHorizontal:18,borderRadius:9,backgroundColor:'#d9ff58',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,marginTop:26},connectLabel:{color:'#111318',fontWeight:'800',fontSize:14},disabled:{opacity:.5},note:{color:'#777b87',fontSize:12,marginTop:15,textAlign:'center'},error:{color:'#ff8a8a',fontSize:13,margin:12,textAlign:'center'},content:{flex:1},accountRow:{minHeight:70,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#292c35'},accountInfo:{flexDirection:'row',alignItems:'center',gap:10},onlineDot:{width:8,height:8,borderRadius:4,backgroundColor:'#d9ff58'},accountEmail:{color:'#eceef3',fontSize:13,fontWeight:'700'},accountCaption:{color:'#777b87',fontSize:10,letterSpacing:1,marginTop:4},disconnect:{padding:8},disconnectText:{color:'#aeb2bd',fontSize:12},main:{flex:1,flexDirection:'row'},list:{flex:1,borderRightWidth:1,borderRightColor:'#292c35'},row:{minHeight:92,paddingHorizontal:14,paddingVertical:13,flexDirection:'row',gap:9,borderBottomWidth:1,borderBottomColor:'#24272f'},rowSelected:{backgroundColor:'#252830'},unreadDot:{width:7,height:7,borderRadius:4,backgroundColor:'#d9ff58',marginTop:5},readDot:{backgroundColor:'transparent'},messageCopy:{flex:1},sender:{color:'#c6c8d0',fontSize:13},bold:{fontWeight:'800',color:'#f1f2f5'},messageSubject:{color:'#c6c8d0',fontSize:13,marginTop:5},snippet:{color:'#777b87',fontSize:12,marginTop:4,lineHeight:17},reader:{flex:1,paddingHorizontal:24,paddingTop:30},subject:{color:'#f1f2f5',fontSize:22,fontWeight:'800'},from:{color:'#d0d2da',fontSize:13,marginTop:22},date:{color:'#777b87',fontSize:11,marginTop:5},body:{color:'#c3c6cf',fontSize:15,lineHeight:24,marginTop:25},empty:{flex:1,alignItems:'center',justifyContent:'center'},emptyTitle:{color:'#aeb2bd',fontSize:16}});
