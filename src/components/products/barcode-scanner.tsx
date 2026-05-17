'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Barcode, Camera, Loader2, Search, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type BarcodeLookupResult = {
  barcode: string;
  name: string;
  imageUrl?: string | null;
  servingBase: number;
  servingUnit: 'g' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

const barcodeInputId = 'barcode-lookup-input';

export function BarcodeScanner({
  onFound,
}: {
  onFound: (data: BarcodeLookupResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const isProcessingRef = useRef(false);
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => stopCamera, []);

  async function lookupBarcode(rawBarcode: string) {
    const cleanBarcode = rawBarcode.replace(/\D/g, '');
    if (!cleanBarcode) {
      toast.error('Enter or scan a barcode first.');
      return;
    }

    setBarcode(cleanBarcode);
    setIsLookingUp(true);
    stopCamera();

    try {
      const res = await fetch(`/api/barcode/${cleanBarcode}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Product not found for this barcode');
      }

      onFound(data);
      toast.success('Product found. Verify the values before saving.');
    } catch (error: any) {
      toast.error(error.message || 'Barcode lookup failed');
    } finally {
      setIsLookingUp(false);
    }
  }

  async function startCamera() {
    setCameraError(null);
    setIsScanning(true);

    try {
      const video = videoRef.current;
      if (!video) return;

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);

      readerRef.current = new BrowserMultiFormatReader(hints);
      controlsRef.current = await readerRef.current.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        video,
        (result) => {
          const value = result?.getText();
          if (!value || isProcessingRef.current) return;

          isProcessingRef.current = true;
          lookupBarcode(value).finally(() => {
            isProcessingRef.current = false;
          });
        },
      );
    } catch (error: any) {
      stopCamera();
      setCameraError(error.message || 'Camera access failed.');
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="relative overflow-hidden rounded-lg border bg-black">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            playsInline
            muted
          />
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
              <Barcode className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Scan product barcode</p>
                <p className="text-xs text-muted-foreground">
                  Use the rear camera and center the barcode.
                </p>
              </div>
            </div>
          )}
          {isLookingUp && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Looking up product...</span>
              </div>
            </div>
          )}
        </div>

        {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}

        <div className="flex gap-2">
          {isScanning ? (
            <Button type="button" variant="outline" className="flex-1" onClick={stopCamera}>
              <StopCircle className="mr-2 h-4 w-4" />
              Stop camera
            </Button>
          ) : (
            <Button type="button" className="flex-1" onClick={startCamera} disabled={isLookingUp}>
              <Camera className="mr-2 h-4 w-4" />
              Start camera scan
            </Button>
          )}
        </div>

        <form
          className="grid gap-2 sm:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            lookupBarcode(String(formData.get('barcode') ?? ''));
          }}
        >
          <Input
            id={barcodeInputId}
            ref={barcodeInputRef}
            name="barcode"
            inputMode="numeric"
            placeholder="Enter barcode if camera cannot scan"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            onInput={(event) => setBarcode(event.currentTarget.value)}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={isLookingUp}
          >
            <Search className="mr-2 h-4 w-4" />
            Lookup
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
