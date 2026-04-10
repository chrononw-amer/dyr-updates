
import os

path = r'c:\Users\C0QA\Downloads\CHRONO DEVELOPMENT - 3-3-2026\CHRONO DEVELOPMENT - 10-02-2026\src\App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_status_block = """                                {ins.chequeStatus && (
                                  <div style={{
                                    color: ins.chequeStatus === 'Cleared' ? '#2563EB' : ins.chequeStatus === 'Rejected' ? '#DC2626' : '#64748B',
                                    marginTop: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    textTransform: 'uppercase'
                                  }}>
                                    Status: {ins.chequeStatus}
                                  </div>
                                )}"""

new_status_block = """                                {(() => {
                                  const mainStatus = ins.chequeStatus;
                                  const allStatuses = (ins.payments || []).map(p => p.chequeStatus).filter(s => s && s !== 'Not Collected' && s !== 'Not Received');
                                  if (mainStatus && mainStatus !== 'Not Collected' && mainStatus !== 'Not Received') { allStatuses.push(mainStatus); }
                                  const uniqueStatuses = [...new Set(allStatuses)];
                                  const status = uniqueStatuses.length > 0 ? uniqueStatuses.join(' / ') : (mainStatus || 'Not Collected');
                                  
                                  return (
                                    <div style={{
                                      color: status.includes('Rejected') ? '#DC2626' : status.includes('Cleared') ? '#2563EB' : '#64748B',
                                      marginTop: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: '900',
                                      textTransform: 'uppercase'
                                    }}>
                                      Status: {status}
                                    </div>
                                  );
                                })()}"""

if old_status_block in content:
    print("Found and replacing!")
    new_content = content.replace(old_status_block, new_status_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
else:
    # Try with different indentation or slightly different string
    print("Not Found with exact match. Trying fuzzy match for the status line.")
    # Fallback to replace_file_content if this fails
