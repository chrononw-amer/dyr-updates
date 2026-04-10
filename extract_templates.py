import re
import binascii
import struct

def extract_strings(file_path):
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Search for common bank names
    banks = [rb"CIB", rb"National Bank of Egypt", rb"Banque Misr", rb"QNB", rb"HSBC", rb"Alex Bank", rb"Faisal", rb"ADIB"]
    
    for bank_name in banks:
        matches = list(re.finditer(bank_name, data))
        if not matches:
            # Try lowercase/abbreviated for some
            if bank_name == rb"National Bank of Egypt":
                matches = list(re.finditer(rb"NBE|Al Ahly", data, re.IGNORECASE))
            elif bank_name == rb"Banque Misr":
                matches = list(re.finditer(rb"Misr", data, re.IGNORECASE))
            
        if not matches:
            continue
            
        print(f"\n--- Found {bank_name.decode()} ---")
        for m in matches[:2]:
            start = m.start()
            end = start + 800
            context = data[start:end]
            print(f"Index: {start}")
            
            # Print strings found in context
            strs = re.findall(rb"[a-zA-Z0-9_]{3,}", context)
            print("Strings:", [s.decode() for s in strs if len(s) > 2])
            
            # Try to find sequences of integers that might be (x, y, fontsize, rotation)
            # Coordinates are usually 0-300 (mm) or 0-2000 (app units)
            print("Potential Values:")
            for i in range(0, len(context) - 4, 2): # Check every 2 bytes
                # Try 4-byte int
                if i + 4 <= len(context):
                    val = struct.unpack("<I", context[i:i+4])[0]
                    if 0 < val < 500:
                        print(f"  Int4 at {i}: {val}")
                # Try 2-byte short
                val2 = struct.unpack("<H", context[i:i+2])[0]
                if 0 < val2 < 500:
                    print(f"  Int2 at {i}: {val2}")

if __name__ == "__main__":
    db_path = r"C:\Program Files (x86)\Echo Soft\Checks\db\echo_checks.db"
    extract_strings(db_path)
