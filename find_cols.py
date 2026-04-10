import re

def find_columns(file_path):
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Sybase ASA column names usually appear in metadata blocks
    # We'll look for fields ending in _x, _y, _h, _w, _f
    fields = re.findall(rb"[a-zA-Z0-9_]{2,30}_[xyhwf]", data)
    unique_fields = sorted(list(set([f.decode() for f in fields])))
    print("Coordinates fields:", unique_fields)

    # Also look for field names that might be descriptors
    # like payee, date, amount, amount_in_words
    descriptors = [rb"payee", rb"date", rb"amount", rb"words", rb"bank_name", rb"cheque"]
    found_desc = []
    for d in descriptors:
        if d in data:
            found_desc.append(d.decode())
    print("Found descriptors:", found_desc)

if __name__ == "__main__":
    db_path = r"C:\Program Files (x86)\Echo Soft\Checks\db\echo_checks.db"
    find_columns(db_path)
