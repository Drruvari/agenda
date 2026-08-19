export type MarkdownTokenKind =
  'marker' | 'heading1' | 'heading2' | 'heading3' | 'bold' | 'italic' | 'code' | 'strike';

export type MarkdownToken = {
  text: string;
  kind?: MarkdownTokenKind;
};
