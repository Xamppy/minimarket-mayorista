/**
 * Tests for thermal printer utilities
 */

import {
  THERMAL_PRINT_CONFIG,
  getThermalPrintStyles,
  generateThermalPrintCSS,
  truncateText,
  formatCurrency,
  formatDateForThermal,
  calculateOptimalTextWidth,
  getBrowserPrintCapabilities,
} from '../thermal-printer';
import { THERMAL_PRINTER_PRESETS } from '../../types/thermal-print';

describe('Thermal Printer Utilities', () => {
  describe('THERMAL_PRINT_CONFIG', () => {
    it('should have correct default configuration', () => {
      expect(THERMAL_PRINT_CONFIG).toEqual(THERMAL_PRINTER_PRESETS.standard80mm.config);
      expect(THERMAL_PRINT_CONFIG.paperWidth).toBe(80);
      expect(THERMAL_PRINT_CONFIG.printableWidth).toBe(72);
    });
  });

  describe('getThermalPrintStyles', () => {
    it('should generate styles object with correct structure', () => {
      const styles = getThermalPrintStyles();
      
      expect(styles).toHaveProperty('pageConfig');
      expect(styles).toHaveProperty('bodyStyles');
      expect(styles).toHaveProperty('ticketContainer');
      expect(styles).toHaveProperty('typography');
      expect(styles).toHaveProperty('layout');
      
      expect(styles.typography).toHaveProperty('header');
      expect(styles.typography).toHaveProperty('section');
      expect(styles.typography).toHaveProperty('body');
      expect(styles.typography).toHaveProperty('small');
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        ...THERMAL_PRINT_CONFIG,
        printableWidth: 70,
        fontSize: { ...THERMAL_PRINT_CONFIG.fontSize, header: 16 },
      };
      
      const styles = getThermalPrintStyles(customConfig);
      
      expect(styles.ticketContainer).toContain('70mm');
      expect(styles.typography.header).toContain('16px');
    });
  });

  describe('generateThermalPrintCSS', () => {
    it('should generate valid CSS string', () => {
      const css = generateThermalPrintCSS();
      
      expect(css).toContain('@media print');
      expect(css).toContain('@page');
      expect(css).toContain('.thermal-ticket');
      expect(css).toContain('.thermal-header');
      expect(css).toContain('80mm auto');
    });

    it('should include all required CSS classes', () => {
      const css = generateThermalPrintCSS();
      
      const requiredClasses = [
        '.thermal-ticket',
        '.thermal-header',
        '.thermal-section',
        '.thermal-body',
        '.thermal-small',
        '.thermal-separator',
        '.thermal-row',
        '.thermal-center',
        '.thermal-bold',
        '.no-print',
      ];

      requiredClasses.forEach(className => {
        expect(css).toContain(className);
      });
    });
  });

  describe('truncateText', () => {
    it('should return original text if within limit', () => {
      const text = 'Short text';
      const result = truncateText(text, 20);
      expect(result).toBe(text);
    });

    it('should truncate long text with ellipsis', () => {
      const text = 'This is a very long text that should be truncated';
      const result = truncateText(text, 20);
      expect(result).toHaveLength(23); // 20 + '...'
      expect(result).toEndWith('...');
    });

    it('should break at word boundaries when possible', () => {
      const text = 'This is a test';
      const result = truncateText(text, 10);
      expect(result).toBe('This is a...');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with dollar sign and two decimals', () => {
      expect(formatCurrency(10)).toBe('$10.00');
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(10.555)).toBe('$10.56');
    });
  });

  describe('formatDateForThermal', () => {
    it('should format date and time correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateForThermal(date);
      
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result.date).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result.time).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('calculateOptimalTextWidth', () => {
    it('should calculate text width based on printable width', () => {
      const width = calculateOptimalTextWidth();
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThan(200); // Reasonable upper bound
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        ...THERMAL_PRINT_CONFIG,
        printableWidth: 60,
      };
      
      const width = calculateOptimalTextWidth(customConfig);
      const defaultWidth = calculateOptimalTextWidth();
      
      expect(width).toBeLessThan(defaultWidth);
    });
  });

  describe('getBrowserPrintCapabilities', () => {
    it('should return capabilities object', () => {
      const capabilities = getBrowserPrintCapabilities();
      
      expect(capabilities).toHaveProperty('isChrome');
      expect(capabilities).toHaveProperty('isFirefox');
      expect(capabilities).toHaveProperty('isSafari');
      expect(capabilities).toHaveProperty('isEdge');
      expect(capabilities).toHaveProperty('supportsCSSPrint');
      
      Object.values(capabilities).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });
});