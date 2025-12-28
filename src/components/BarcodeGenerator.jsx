import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeGenerator = ({
  value,
  width = 2,
  height = 50,
  displayValue = true,
  fontSize = 12,
  margin = 10
}) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: margin,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (error) {
        console.error('Barcode generation error:', error);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  if (!value) {
    return null;
  }

  return <svg ref={barcodeRef}></svg>;
};

export default BarcodeGenerator;
