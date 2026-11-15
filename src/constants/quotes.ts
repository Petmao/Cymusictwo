export type SadQuote = { zh: string; en: string }

/** 「我的」页顶部随机短句：中文在上，英文在下 */
export const sadQuotes: SadQuote[] = [
	{ zh: '事与愿违，那就祝你幸福。', en: 'If it backfires, I wish you happiness.' },
	{ zh: '后来我们什么都有了，就是没有我们。', en: 'We had everything later, except us.' },
	{ zh: '我把喜欢藏在歌里，你把歌单换成了别人。', en: 'I hid my love in songs; you swapped the playlist for someone else.' },
	{ zh: '有些告别，连一句再见都省了。', en: 'Some goodbyes do not even bother with a goodbye.' },
	{ zh: '你说的以后，后来没有我。', en: 'The later you promised had no me in it.' },
	{ zh: '风吹散了我们，也吹散了我以为的永远。', en: 'The wind scattered us, and the forever I believed in.' },
	{ zh: '我删了聊天记录，删不掉夜里想起你。', en: 'I deleted the chats, not the midnight thoughts of you.' },
	{ zh: '星星还是那颗星星，看星星的人少了你。', en: 'Same stars, one fewer person watching.' },
	{ zh: '我没有等你，我只是还没走。', en: 'I am not waiting for you; I just have not left.' },
	{ zh: '原来被记住，也是一种奢侈。', en: 'Being remembered turns out to be a luxury.' },
	{ zh: '我们在同一个城市，过着两个世界。', en: 'Same city, two different worlds.' },
	{ zh: '你说祝我快乐，可我的快乐里有你。', en: 'You wished me happiness; my happiness had you in it.' },
	{ zh: '你走之后，连天气都变得客气。', en: 'After you left, even the weather turned polite.' },
	{ zh: '我把想念调成了静音。', en: 'I put my missing you on mute.' },
	{ zh: '那些没说出口的话，最后都成了歌。', en: 'The words I never said all became songs.' },
	{ zh: '我们输给了时间，也输给了沉默。', en: 'We lost to time, and to silence.' },
	{ zh: '你是我关掉灯才敢想的人。', en: 'You are the one I only dare think of with the lights off.' },
	{ zh: '后来月亮还是月亮，只是不再为我们圆。', en: 'The moon stayed the moon, just no longer full for us.' },
	{ zh: '我学着不问归期，也学着不再等你。', en: 'I learned not to ask when you return, nor to wait.' },
	{ zh: '你走后，我把房间收拾得很干净，像没人住过。', en: 'After you left I cleaned the room, as if no one lived here.' },
	{ zh: '有些人只适合在歌里重逢。', en: 'Some people are only meant to meet again in songs.' },
	{ zh: '我很好，只是偶尔不太好。', en: 'I am fine, just occasionally not.' },
	{ zh: '我们的故事停在了没发出去的那条消息。', en: 'Our story stopped at an unsent message.' },
	{ zh: '得不到回应的热情，要懂得适可而止。', en: 'Enthusiasm without an answer should know when to stop.' },
	{ zh: '后来人间烟火，处处像你，处处不是你。', en: 'Every corner of the world looks like you, and none of it is you.' },
	{ zh: '我想你了，但我不想再输了。', en: 'I miss you, but I do not want to lose again.' },
	{ zh: '祝你前程似锦，祝我刀枪不入。', en: 'May your future shine; may I grow unbreakable.' },
	{ zh: '你是我最温柔的遗憾。', en: 'You are my gentlest regret.' },
	{ zh: '喜欢是藏不住的，失望也是。', en: 'Fondness cannot be hidden, and neither can disappointment.' },
	{ zh: '我站在人海里，忽然觉得谁都不是你。', en: 'Standing in the crowd, I realised no one is you.' },
]

export const pickRandomQuote = (): SadQuote =>
	sadQuotes[Math.floor(Math.random() * sadQuotes.length)]
