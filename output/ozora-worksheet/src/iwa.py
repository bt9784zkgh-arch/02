import sys,re
def varint(b,i):
    r=s=0
    while True:
        c=b[i];i+=1;r|=(c&0x7f)<<s;s+=7
        if c<0x80:return r,i
def snappy(b):
    n,i=varint(b,0);o=bytearray()
    while i<len(b):
        t=b[i];i+=1;k=t&3
        if k==0:
            l=t>>2
            if l>=60:
                nb=l-59;l=int.from_bytes(b[i:i+nb],'little');i+=nb
            l+=1;o+=b[i:i+l];i+=l;continue
        if k==1:l=((t>>2)&7)+4;off=((t>>5)<<8)|b[i];i+=1
        elif k==2:l=(t>>2)+1;off=int.from_bytes(b[i:i+2],'little');i+=2
        else:l=(t>>2)+1;off=int.from_bytes(b[i:i+4],'little');i+=4
        for _ in range(l):o.append(o[-off])
    return bytes(o)
def iwa(path):
    d=open(path,'rb').read();i=0;out=b''
    while i<len(d):
        assert d[i]==0;l=int.from_bytes(d[i+1:i+4],'little');out+=snappy(d[i+4:i+4+l]);i+=4+l
    return out
if __name__=='__main__':
    sys.stdout.buffer.write(iwa(sys.argv[1]))
