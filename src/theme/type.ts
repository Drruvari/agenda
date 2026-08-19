import { fonts } from '@/theme/fonts';

export const type = {
  largeTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: -0.7,
  },
  title: {
    fontFamily: fonts.sansSemi,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  sheetTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.25,
  },
  rowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  formLabel: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 17,
  },
  caption: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
} as const;
