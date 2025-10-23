import { Stack } from "expo-router";

export default function RootLayout() {
  return(
    <Stack>
      <Stack.Screen name="index" options={{ title:'Home'}}/>
      <Stack.Screen name="ask" options={{ title:'Ask Chatbot'}}/>
      <Stack.Screen name="live" options={{ title:'Live Annoucements'}}/>
      <Stack.Screen name="updates" options={{ title:'Updates Dashboard'}}/>

    </Stack>


  );
    
    
    
    
    
    ;
}
