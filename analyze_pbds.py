import re

def extract_pbd_strings(file_path):
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Search for DataWindow syntax components
    # Look for things like "x=", "y=", "width=", "height="
    pats = [rb"x=\"\d+\"", rb"y=\"\d+\"", rb"width=\"\d+\"", rb"height=\"\d+\""]
    print(f"\n--- Checking {file_path} ---")
    for pat in pats:
        matches = re.findall(pat, data)
        if matches:
            print(f"Found {len(matches)} matches for {pat.decode()}")
            print("First 10:", [m.decode() for m in matches[:10]])

if __name__ == "__main__":
    pbds = [
        r"C:\Program Files (x86)\Echo Soft\Checks\check1.pbd",
        r"C:\Program Files (x86)\Echo Soft\Checks\check2.pbd",
        r"C:\Program Files (x86)\Echo Soft\Checks\check_contract.pbd"
    ]
    for pbd in pbds:
        extract_pbd_strings(pbd)
