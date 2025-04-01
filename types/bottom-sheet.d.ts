/**
 * Type definitions for @gorhom/bottom-sheet
 */

import React from 'react';

declare module '@gorhom/bottom-sheet' {
  // Define interfaces for BottomSheet props
  export interface BottomSheetProps {
    ref?: React.RefObject<any>;
    index?: number;
    snapPoints: (string | number)[];
    onChange?: (index: number) => void;
    handleIndicatorStyle?: any;
    backgroundStyle?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }

  // Define interfaces for BottomSheetView props
  export interface BottomSheetViewProps {
    style?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }

  // Export the components with proper types
  const BottomSheet: React.FC<BottomSheetProps>;
  const BottomSheetView: React.FC<BottomSheetViewProps>;

  export default BottomSheet;
  export { BottomSheetView };
} 