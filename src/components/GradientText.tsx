import { useAppTheme } from '@/hooks/useAppTheme'
import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg'

type Props = {
	text: string
	size: number
	/** 取主题里的渐变：gold / textGlow / accent */
	from?: 'gold' | 'textGlow' | 'accent'
	weight?: '600' | '700' | '800'
	letterSpacing?: number
	style?: StyleProp<ViewStyle>
}

/**
 * 渐变字。RN 没有 background-clip:text，用 Svg 文本 + 线性渐变填充，
 * 宽高按字号推，宽度铺满父容器，所以长句也不会被裁。
 */
export const GradientText = ({
	text,
	size,
	from = 'gold',
	weight = '800',
	letterSpacing = 0,
	style,
}: Props) => {
	const { gradients } = useAppTheme()
	const colors = gradients[from]
	const height = Math.round(size * 1.42)

	return (
		<Svg width="100%" height={height} style={style}>
			<Defs>
				<LinearGradient id="gtext" x1="0" y1="0" x2="1" y2="0">
					{colors.map((color, index) => (
						<Stop
							key={`${color}-${index}`}
							offset={colors.length === 1 ? 0 : index / (colors.length - 1)}
							stopColor={color}
						/>
					))}
				</LinearGradient>
			</Defs>
			<SvgText
				x="0"
				y={Math.round(size * 1.14)}
				fill="url(#gtext)"
				fontSize={size}
				fontWeight={weight}
				letterSpacing={letterSpacing}
			>
				{text}
			</SvgText>
		</Svg>
	)
}
