import json,sys
from collections import defaultdict
def timeline(path='frames/log.json',step=.03):
    L=json.load(open(path))['log'];out={}
    for seg,v in L.items():
        g=defaultdict(list)
        for n,t in v:g[t].append(n)
        t0=min(g);fr=[]
        for t in sorted(g):
            ns=g[t]
            for k,n in enumerate(ns):fr.append((t-t0+k*step/len(ns),n))
        out[seg]=fr
    return out
def at(fr,t):
    import bisect;ts=[x for x,_ in fr];i=bisect.bisect_left(ts,t);i=min(max(i,0),len(fr)-1)
    if i>0 and abs(ts[i-1]-t)<abs(ts[i]-t):i-=1
    return fr[i][1]
