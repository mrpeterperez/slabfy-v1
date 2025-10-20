# Certificate Scanner Feature

## Overview

The Certificate Scanner feature provides a streamlined interface for adding graded cards to your collection. It supports both barcode scanning of PSA slabs and manual entry of certificate numbers from other grading companies (BGS, SGC, etc.).

## Features

- **Barcode Scanning**: Scan PSA slabs directly with barcode scanner hardware
- **Manual Entry**: Type certificate numbers manually with auto-complete
- **Batch Processing**: Add multiple certificates in one session
- **Real-time Validation**: Cards are verified and enriched with data from grading company APIs
- **Status Tracking**: Visual indicators for pending, successful, and failed additions
- **Duplicate Detection**: Automatically identifies duplicates in current batch or existing collection

## Usage

### Initial Scanning

1. Click "Add Asset" to open the scanner dialog
2. For PSA slabs, scan the barcode using a connected scanner
3. For other certificates (BGS, SGC), type the certificate number in the input field
4. Press Enter or click the "+" button to add the certificate

### Batch Processing

After scanning the first certificate, the interface will show a table view:

1. Continue scanning additional certificates - the input remains focused
2. Each certificate is automatically processed and validated
3. Review the status, details, and grade of each card
4. Remove any unwanted entries using the "X" button
5. When finished, click "Add X Assets" to add all cards to your collection

## Implementation

The feature uses a two-stage UI flow:

1. **Initial View**: Shows scanning UI with barcode scan area and input field
2. **Table View**: Shows input field at top and table of scanned certificates below

Key technical details:

- Auto-focus management for continuous scanning
- Asynchronous API calls for certificate validation
- Optimized for barcode scanner hardware that sends Enter after scan
- Status tracking with appropriate visual indicators
- Real-time certificate information fetching

## API Integration

The feature interfaces with the following APIs:

- PSA certificate validation API
- BGS certificate validation API 
- SGC certificate validation API
- Internal duplicate detection API

## Dependencies

- React 17+
- shadcn/ui components:
  - Dialog
  - Button
  - Input
- Lucide React icons

## Known Limitations

- Only PSA slabs support direct barcode scanning
- API response times may vary depending on the grading company
- Very old certificates may have limited information available






this is just the same code - i was playing around with 

import { useState, useEffect, useRef } from 'react';
import { ScanLine, Plus, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const FinalScannerFlow = () => {
  const [certNumber, setCertNumber] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [certList, setCertList] = useState([]);
  const inputRef = useRef(null);

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Demo automatic scan after 3 seconds
  useEffect(() => {
    if (certList.length === 0) {
      const timer = setTimeout(() => {
        simulateScan();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [certList.length]);

  const simulateScan = () => {
    // Generate a random certificate for demo
    const prefixes = ['PSA', 'BGS', 'SGC'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(10000000 + Math.random() * 90000000);
    const certNum = `${prefix}-${number}`;

    setIsScanning(true);

    setTimeout(() => {
      setCertNumber(certNum);

      setTimeout(() => {
        handleAddCert();
        setIsScanning(false);
      }, 800);
    }, 300);
  };

  const handleAddCert = async () => {
    if (certNumber.trim() === "") return;

    // Add the new certificate to the list
    const newCert = {
      id: `cert-${Date.now()}`,
      certNumber: certNumber.trim(),
      status: 'pending',
      timestamp: Date.now(),
    };

    const updatedList = [...certList, newCert];
    setCertList(updatedList);
    setCertNumber(""); // Clear the input field

    // Re-focus the input for the next scan
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Simulate API fetch to get card details
    setTimeout(() => {
      setCertList(prevList => 
        prevList.map(cert => 
          cert.id === newCert.id 
            ? { 
                ...cert, 
                status: 'success',
                name: `${cert.certNumber.startsWith('PSA') ? '2018 Bowman Chrome Shohei Ohtani' : 
                       cert.certNumber.startsWith('BGS') ? '1996 Topps Chrome Kobe Bryant Rookie' : 
                       '2021 Panini Prizm Justin Herbert'}`,
                grade: Math.floor(Math.random() * 3) + 8,
                year: cert.certNumber.startsWith('PSA') ? 2018 : 
                      cert.certNumber.startsWith('BGS') ? 1996 : 2021,
                set: cert.certNumber.startsWith('PSA') ? 'Bowman Chrome' : 
                     cert.certNumber.startsWith('BGS') ? 'Topps Chrome' : 'Panini Prizm',
                player: cert.certNumber.startsWith('PSA') ? 'Shohei Ohtani' : 
                        cert.certNumber.startsWith('BGS') ? 'Kobe Bryant' : 'Justin Herbert'
              } 
            : cert
        )
      );
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddCert();
    }
  };

  const handleRemoveCert = (id) => {
    setCertList(certList.filter(cert => cert.id !== id));
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending':
        return <Loader size={16} className="text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Add Asset</h2>
        </div>
      </div>

      {/* Modal Content */}
      <div className="px-6 py-4">
        <div className="flex flex-col space-y-6">
          {/* If no certificates yet, show the scan UI */}
          {certList.length === 0 ? (
            <>
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium">Scan PSA Slabs</h3>
                <div className={`p-6 border-2 border-dashed ${isScanning ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg inline-block mx-auto`}>
                  <ScanLine className={`h-12 w-12 ${isScanning ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <p className="text-sm text-gray-500">
                  Only PSA slabs support scanning.
                </p>
              </div>

              <div className="w-full border-t border-gray-200" />

              <div className="text-center space-y-4 w-full">
                <p className="text-sm">
                  For BGS, SGC and others, enter cert number below
                </p>
                <div className="flex max-w-xs mx-auto">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter Cert Number"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoComplete="off"
                  />
                  <button 
                    onClick={handleAddCert}
                    disabled={certNumber.trim() === ""}
                    className="px-3 py-2 rounded-r-md bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="text-center w-full">
                <button
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Enter Manually
                </button>
              </div>
            </>
          ) : (
            <>
              {/* When certificates exist, show input field with + button */}
              <div className="flex w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter or Scan Next Certificate"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="off"
                />
                <button 
                  onClick={handleAddCert}
                  disabled={certNumber.trim() === ""}
                  className="px-3 py-2 rounded-r-md bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Certificate Table */}
              <div className="w-full border border-gray-200 rounded-md overflow-hidden">
                <div className="text-sm font-medium text-gray-700 px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span>Certificates to Add ({certList.length})</span>
                  {certList.some(cert => cert.status === 'pending') && (
                    <span className="text-blue-600 text-xs flex items-center">
                      <Loader size={12} className="animate-spin mr-1" /> 
                      Fetching card details...
                    </span>
                  )}
                </div>

                <div className="overflow-y-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card Details</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {certList.map((cert) => (
                        <tr key={cert.id} className={cert.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusIcon(cert.status)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{cert.certNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            {cert.status === 'pending' && (
                              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                            )}
                            {cert.status === 'error' && (
                              <div className="text-sm text-red-500">{cert.error}</div>
                            )}
                            {cert.status === 'success' && (
                              <div>
                                <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                                <div className="text-sm text-gray-500">{cert.year} {cert.set}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {cert.status === 'success' && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {cert.grade}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleRemoveCert(cert.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-200"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Footer - Only show when we have certificates */}
      {certList.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={() => {
              alert(`Added ${certList.length} assets successfully!`);
              setCertList([]);
            }}
            disabled={certList.some(cert => cert.status === 'pending')}
            className={`w-full py-2 px-4 rounded font-medium transition-colors duration-200 ${
              certList.some(cert => cert.status === 'pending')
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Add {certList.length} Asset{certList.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Demo controls - not part of real implementation */}
      <div className="absolute top-2 right-2 text-xs text-gray-400">
        {certList.length > 0 && <button onClick={simulateScan} className="underline">Simulate another scan</button>}
        {certList.length === 0 && <span>Auto-scanning demo will begin shortly...</span>}
      </div>
    </div>
  );
};

export default FinalScannerFlow;