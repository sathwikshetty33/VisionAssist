/**
 * High-contrast colors for accessibility
 * Designed for sight-impaired users with WCAG AAA compliance
 */

// Primary colors with maximum contrast
const Colors = {
  // Dark theme - primary for low vision users
  dark: {
    background: '#000000',
    surface: '#0D0D0D',
    surfaceElevated: '#1A1A1A',
    
    // Primary accent - bright yellow for maximum visibility
    primary: '#FFD700',
    primaryPressed: '#FFC000',
    
    // Secondary accent - cyan for contrast
    secondary: '#00FFFF',
    secondaryPressed: '#00CCCC',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#E0E0E0',
    textMuted: '#A0A0A0',
    
    // Status colors
    success: '#00FF00',
    warning: '#FFA500',
    error: '#FF4444',
    emergency: '#FF0000',
    
    // SOS specific
    sosBackground: '#FF0000',
    sosText: '#FFFFFF',
    
    // Tab bar
    tabBarBackground: '#0D0D0D',
    tabIconDefault: '#666666',
    tabIconSelected: '#FFD700',
    
    // Borders
    border: '#333333',
    borderFocus: '#FFD700',
  },
  
  // Light theme (for users who prefer it)
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceElevated: '#EEEEEE',
    
    primary: '#1A1A1A',
    primaryPressed: '#333333',
    
    secondary: '#0066CC',
    secondaryPressed: '#0055AA',
    
    text: '#000000',
    textSecondary: '#333333',
    textMuted: '#666666',
    
    success: '#00AA00',
    warning: '#CC7700',
    error: '#CC0000',
    emergency: '#FF0000',
    
    sosBackground: '#FF0000',
    sosText: '#FFFFFF',
    
    tabBarBackground: '#FFFFFF',
    tabIconDefault: '#888888',
    tabIconSelected: '#1A1A1A',
    
    border: '#CCCCCC',
    borderFocus: '#0066CC',
  },
};

// Font sizes optimized for low vision
export const FontSizes = {
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
  giant: 64,
};

// Touch target sizes (minimum 44x44 per WCAG, we use larger)
export const TouchTargets = {
  minimum: 60,
  medium: 80,
  large: 100,
  sos: 200,
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export default Colors;
