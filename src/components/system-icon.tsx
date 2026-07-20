import { Image, type ImageStyle } from 'expo-image';
import { Text, type ColorValue, type StyleProp, type TextStyle } from 'react-native';

export function SystemIcon({
  name,
  fallback,
  size = 20,
  color,
  style,
}: {
  name: string;
  fallback: string;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ImageStyle>;
}) {
  if (process.env.EXPO_OS !== 'ios') {
    return (
      <Text
        style={[
          { color, fontSize: size, lineHeight: size, textAlign: 'center' } satisfies TextStyle,
          style as StyleProp<TextStyle>,
        ]}
      >
        {fallback}
      </Text>
    );
  }

  return (
    <Image
      source={`sf:${name}`}
      style={[{ width: size, height: size, tintColor: color }, style]}
      contentFit="contain"
    />
  );
}
