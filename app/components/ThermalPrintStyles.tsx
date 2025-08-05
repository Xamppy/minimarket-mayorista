/**
 * Component for injecting thermal print styles
 * Can be used as a component or for server-side rendering
 */

import { generateThermalPrintCSS, THERMAL_PRINT_CONFIG, type ThermalPrintConfig } from '../utils/thermal-printer';

interface ThermalPrintStylesProps {
  config?: ThermalPrintConfig;
}

export const ThermalPrintStyles: React.FC<ThermalPrintStylesProps> = ({ 
  config = THERMAL_PRINT_CONFIG 
}) => {
  const css = generateThermalPrintCSS(config);

  return (
    <style 
      id="thermal-print-styles"
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
};

export default ThermalPrintStyles;