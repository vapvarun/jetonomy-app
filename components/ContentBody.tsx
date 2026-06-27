// components/ContentBody.tsx — renders server post/reply HTML safely with RN
// primitives. No external HTML-renderer dependency is installed, so this ships a
// small, dependency-free parser covering the tags Jetonomy emits (p, br, strong/
// b, em/i, a, code, pre, blockquote, ul/ol/li, h1-6, img) plus bare-URL link
// cards via getLinkPreview. Unknown tags degrade to their text content.

import { useState, type ReactNode } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getLinkPreview } from '@/api/linkPreview';
import { useTheme, type ActiveTheme } from '@/theme/ThemeContext';
import { decodeEntities } from '@/utils/html';

export interface ContentBodyProps {
  html: string | null | undefined;
}

// ---- Block model ----------------------------------------------------------

type Block =
  | { kind: 'p'; html: string }
  | { kind: 'heading'; level: number; html: string }
  | { kind: 'quote'; html: string }
  | { kind: 'code'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'linkcard'; url: string };

const URL_ONLY_RE = /^(https?:\/\/[^\s<]+)$/i;

function attr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : '';
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

function parseBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  // Group map: 1=h level, 2=h content, 3=blockquote, 4=pre, 5=ul|ol tag,
  // 6=list content, 7=img attrs, 8=figure content, 9=p content.
  const re = new RegExp(
    '<h([1-6])[^>]*>([\\s\\S]*?)<\\/h\\1>' +
      '|<blockquote[^>]*>([\\s\\S]*?)<\\/blockquote>' +
      '|<pre[^>]*>([\\s\\S]*?)<\\/pre>' +
      '|<(ul|ol)[^>]*>([\\s\\S]*?)<\\/(?:ul|ol)>' +
      '|<img\\b([^>]*?)\\/?>' +
      '|<figure[^>]*>([\\s\\S]*?)<\\/figure>' +
      '|<p[^>]*>([\\s\\S]*?)<\\/p>',
    'gi'
  );

  const pushLoose = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Split loose text on blank lines / consecutive <br> into paragraphs.
    trimmed.split(/\n{2,}|(?:<br\s*\/?>\s*){2,}/i).forEach((seg) => {
      if (stripTags(seg)) addParagraph(blocks, seg);
    });
  };

  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) pushLoose(html.slice(last, m.index));
    last = re.lastIndex;

    if (m[1] !== undefined) {
      blocks.push({ kind: 'heading', level: Number(m[1]), html: m[2] ?? '' });
    } else if (m[3] !== undefined) {
      blocks.push({ kind: 'quote', html: m[3] });
    } else if (m[4] !== undefined) {
      blocks.push({ kind: 'code', text: decodeEntities(m[4].replace(/<[^>]+>/g, '')) });
    } else if (m[5] !== undefined) {
      const items = (m[6] ?? '').match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
      blocks.push({
        kind: 'list',
        ordered: m[5].toLowerCase() === 'ol',
        items: items.map((li) =>
          li.replace(/^<li[^>]*>/i, '').replace(/<\/li>$/i, '')
        ),
      });
    } else if (m[7] !== undefined) {
      blocks.push({ kind: 'image', src: attr(m[7], 'src'), alt: attr(m[7], 'alt') });
    } else if (m[8] !== undefined) {
      const img = m[8].match(/<img\b([^>]*?)\/?>/i);
      if (img) blocks.push({ kind: 'image', src: attr(img[1], 'src'), alt: attr(img[1], 'alt') });
    } else if (m[9] !== undefined) {
      addParagraph(blocks, m[9]);
    }
  }
  if (last < html.length) pushLoose(html.slice(last));
  return blocks;
}

function addParagraph(blocks: Block[], inner: string) {
  const plain = stripTags(inner);
  if (!plain) return;
  if (URL_ONLY_RE.test(plain) && !/<a\b/i.test(inner)) {
    blocks.push({ kind: 'linkcard', url: plain });
  } else {
    blocks.push({ kind: 'p', html: inner });
  }
}

// ---- Inline renderer ------------------------------------------------------

function pop(stack: string[], tag: string) {
  const i = stack.lastIndexOf(tag);
  if (i >= 0) stack.splice(i, 1);
}

function renderInline(html: string, theme: ActiveTheme, keyBase: string): ReactNode[] {
  const { colors, typography } = theme;
  const parts = html.split(/(<[^>]+>)/g);
  const styles: string[] = [];
  let href: string | null = null;
  const out: ReactNode[] = [];
  let k = 0;

  for (const part of parts) {
    if (!part) continue;
    if (part[0] === '<') {
      const t = part.toLowerCase();
      if (/^<(strong|b)[\s>]/.test(t)) styles.push('bold');
      else if (/^<\/(strong|b)>/.test(t)) pop(styles, 'bold');
      else if (/^<(em|i)[\s>]/.test(t)) styles.push('italic');
      else if (/^<\/(em|i)>/.test(t)) pop(styles, 'italic');
      else if (/^<code[\s>]/.test(t)) styles.push('code');
      else if (/^<\/code>/.test(t)) pop(styles, 'code');
      else if (/^<a[\s>]/.test(t)) href = attr(part, 'href') || null;
      else if (/^<\/a>/.test(t)) href = null;
      else if (/^<br\s*\/?>/.test(t)) out.push(<Text key={`${keyBase}-br-${k++}`}>{'\n'}</Text>);
      continue;
    }
    const text = decodeEntities(part);
    if (!text) continue;
    const isCode = styles.includes('code');
    const style = {
      color: href ? colors.accent : colors.text,
      fontSize: typography.size.base,
      fontWeight: styles.includes('bold')
        ? (typography.weight.semibold as '600')
        : (typography.weight.regular as '400'),
      fontStyle: styles.includes('italic') ? ('italic' as const) : ('normal' as const),
      textDecorationLine: href ? ('underline' as const) : ('none' as const),
      fontFamily: isCode ? (typography.family.mono as string | undefined) : undefined,
      backgroundColor: isCode ? colors.bgSubtle : undefined,
    };
    if (href) {
      const url = href;
      out.push(
        <Text key={`${keyBase}-t-${k++}`} style={style} onPress={() => void Linking.openURL(url)}>
          {text}
        </Text>
      );
    } else {
      out.push(
        <Text key={`${keyBase}-t-${k++}`} style={style}>
          {text}
        </Text>
      );
    }
  }
  return out;
}

// ---- Sub-components -------------------------------------------------------

function ContentImage({ src, alt }: { src: string; alt: string }) {
  const { radius, spacing } = useTheme();
  const [ratio, setRatio] = useState(16 / 9);
  if (!src) return null;
  return (
    <Image
      accessibilityLabel={alt || undefined}
      source={{ uri: src }}
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        if (width && height) setRatio(width / height);
      }}
      style={{
        width: '100%',
        aspectRatio: ratio,
        borderRadius: radius.md,
        marginVertical: spacing[2],
      }}
      resizeMode="cover"
    />
  );
}

function LinkCard({ url }: { url: string }) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  const { data, isError } = useQuery({
    queryKey: ['link-preview', url],
    queryFn: () => getLinkPreview(url),
    staleTime: 10 * 60_000,
    retry: 0,
  });

  if (isError || (data && !data.title && !data.image)) {
    // Fallback to a plain tappable link.
    return (
      <Text
        style={{ color: colors.accent, fontSize: typography.size.base, marginVertical: spacing[1] }}
        onPress={() => void Linking.openURL(url)}
      >
        {url}
      </Text>
    );
  }
  if (!data) {
    return (
      <View
        style={{
          height: 72,
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.md,
          marginVertical: spacing[2],
        }}
      />
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void Linking.openURL(url)}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        overflow: 'hidden',
        marginVertical: spacing[2],
      }}
    >
      {data.image ? (
        <Image source={{ uri: data.image }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
      ) : null}
      <View style={{ padding: spacing[3], gap: spacing[1] }}>
        {data.domain ? (
          <Text style={{ color: colors.textMuted, fontSize: typography.size.xs }}>{data.domain}</Text>
        ) : null}
        <Text
          numberOfLines={2}
          style={{
            color: colors.text,
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold as '600',
          }}
        >
          {data.title || url}
        </Text>
        {data.description ? (
          <Text numberOfLines={2} style={{ color: colors.textMuted, fontSize: typography.size.sm }}>
            {data.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ---- Main -----------------------------------------------------------------

export default function ContentBody({ html }: ContentBodyProps) {
  const theme = useTheme();
  const { colors, spacing, radius, typography } = theme;
  if (!html) return null;
  const blocks = parseBlocks(html);

  return (
    <View style={{ gap: spacing[2] }}>
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        switch (b.kind) {
          case 'heading':
            return (
              <Text
                key={key}
                style={{
                  color: colors.text,
                  fontSize: b.level <= 2 ? typography.size.xl : typography.size.lg,
                  fontWeight: typography.weight.bold as '700',
                  marginTop: spacing[2],
                }}
              >
                {renderInline(b.html, theme, key)}
              </Text>
            );
          case 'quote':
            return (
              <View
                key={key}
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: colors.border,
                  paddingLeft: spacing[3],
                  paddingVertical: spacing[1],
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: typography.size.base, lineHeight: typography.lineHeight.base }}>
                  {renderInline(b.html, theme, key)}
                </Text>
              </View>
            );
          case 'code':
            return (
              <View
                key={key}
                style={{
                  backgroundColor: colors.bgSubtle,
                  borderRadius: radius.sm,
                  padding: spacing[3],
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.size.sm,
                    fontFamily: typography.family.mono as string | undefined,
                  }}
                >
                  {b.text}
                </Text>
              </View>
            );
          case 'list':
            return (
              <View key={key} style={{ gap: spacing[1] }}>
                {b.items.map((item, j) => (
                  <View key={`${key}-li-${j}`} style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <Text style={{ color: colors.textMuted, fontSize: typography.size.base }}>
                      {b.ordered ? `${j + 1}.` : '•'}
                    </Text>
                    <Text style={{ flex: 1, color: colors.text, fontSize: typography.size.base, lineHeight: typography.lineHeight.base }}>
                      {renderInline(item, theme, `${key}-li-${j}`)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'image':
            return <ContentImage key={key} src={b.src} alt={b.alt} />;
          case 'linkcard':
            return <LinkCard key={key} url={b.url} />;
          case 'p':
          default:
            return (
              <Text
                key={key}
                style={{ color: colors.text, fontSize: typography.size.base, lineHeight: typography.lineHeight.base }}
              >
                {renderInline(b.html, theme, key)}
              </Text>
            );
        }
      })}
    </View>
  );
}
