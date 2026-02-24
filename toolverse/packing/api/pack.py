"""
Vercel Serverless Function: POST /api/pack
Extreme Points Algorithm for 3D Bin Packing.
"""
from http.server import BaseHTTPRequestHandler
import json, math, time

CONTAINERS = {
    "40HC": {"length": 1203, "height": 269, "width": 235, "maxWeight": 28500},
    "40GP": {"length": 1203, "height": 239, "width": 235, "maxWeight": 26000},
    "20GP": {"length": 589,  "height": 239, "width": 235, "maxWeight": 28000},
}

class Packer:
    def __init__(self, cont, min_sup_pct):
        self.cL = cont["length"]; self.cH = cont["height"]; self.cW = cont["width"]
        self.maxW = cont["maxWeight"]; self.minSup = min_sup_pct / 100.0
        self.eps = [{"x":0,"y":0,"z":0}]; self.packed = []; self.totalW = 0

    def can_place(self, ep, l, h, w):
        if ep["x"]+l > self.cL+0.01 or ep["y"]+h > self.cH+0.01 or ep["z"]+w > self.cW+0.01:
            return False
        for p in self.packed:
            if not (ep["x"]+l<=p["x"]+0.01 or ep["x"]>=p["x"]+p["l"]-0.01 or
                    ep["y"]+h<=p["y"]+0.01 or ep["y"]>=p["y"]+p["h"]-0.01 or
                    ep["z"]+w<=p["z"]+0.01 or ep["z"]>=p["z"]+p["w"]-0.01):
                return False
        return True

    def check_support(self, x, y, z, l, w):
        if y < 0.1: return True
        ba = l * w; sa = 0.0
        for p in self.packed:
            if abs(p["y"]+p["h"]-y) < 0.1:
                sa += max(0,min(x+l,p["x"]+p["l"])-max(x,p["x"])) * max(0,min(z+w,p["z"]+p["w"])-max(z,p["z"]))
        return (sa/ba) >= self.minSup

    def _below_same(self, ep, item):
        tk = item["_tk"]; fp = item["length"]*item["width"]; below = []
        for p in self.packed:
            if p.get("_tk") != tk or p["y"]+p["h"] > ep["y"]+0.1: continue
            ox = max(0,min(ep["x"]+item["length"],p["x"]+p["l"])-max(ep["x"],p["x"]))
            oz = max(0,min(ep["z"]+item["width"],p["z"]+p["w"])-max(ep["z"],p["z"]))
            if ox*oz > min(fp, p["l"]*p["w"])*0.3: below.append(p)
        below.sort(key=lambda b:-(b["y"]+b["h"]))
        return below

    def check_stack(self, ep, item):
        lim = item.get("stackLimit", 999)
        if lim <= 0: return True
        count = 0; cb = ep["y"]
        for b in self._below_same(ep, item):
            if abs(b["y"]+b["h"]-cb) < 1.0: count += 1; cb = b["y"]
        return (count+1) <= lim

    def stack_layer(self, ep, item):
        count = 0; cb = ep["y"]
        for b in self._below_same(ep, item):
            if abs(b["y"]+b["h"]-cb) < 1.0: count += 1; cb = b["y"]
        return count + 1

    def is_dom(self, a, b):
        return a["x"]>=b["x"] and a["y"]>=b["y"] and a["z"]>=b["z"] and (a["x"]>b["x"] or a["y"]>b["y"] or a["z"]>b["z"])

    def place(self, item, ep):
        sl = self.stack_layer(ep, item)
        p = {"name":item["name"],"l":item["length"],"h":item["height"],"w":item["width"],
             "wt":item["weight"],"x":round(ep["x"],1),"y":round(ep["y"],1),"z":round(ep["z"],1),
             "isAgg":item.get("isAgg",False),"aggCnt":item.get("aggCnt",1),
             "_tk":item["_tk"],"stackLimit":item.get("stackLimit",10),"stackLayer":sl,
             "origL":item.get("origL",item["length"]),"origH":item.get("origH",item["height"]),"origW":item.get("origW",item["width"])}
        self.packed.append(p); self.totalW += item["weight"]
        self.eps = [e for e in self.eps if e is not ep]
        for n in [{"x":ep["x"]+item["length"],"y":ep["y"],"z":ep["z"]},
                  {"x":ep["x"],"y":ep["y"]+item["height"],"z":ep["z"]},
                  {"x":ep["x"],"y":ep["y"],"z":ep["z"]+item["width"]}]:
            if n["x"]>self.cL+0.01 or n["y"]>self.cH+0.01 or n["z"]>self.cW+0.01: continue
            if not any(self.is_dom(n,e) for e in self.eps):
                self.eps = [e for e in self.eps if not self.is_dom(e,n)]
                self.eps.append(n)
        self.eps.sort(key=lambda e:(e["y"],e["x"],e["z"]))

    def try_place(self, item):
        if self.totalW + item["weight"] > self.maxW: return False
        for ep in list(self.eps):
            if self.can_place(ep,item["length"],item["height"],item["width"]):
                if self.check_support(ep["x"],ep["y"],ep["z"],item["length"],item["width"]):
                    if self.check_stack(ep,item):
                        self.place(item,ep); return True
        if item.get("allowRotate"):
            rot = dict(item); rot["length"],rot["width"] = item["width"],item["length"]; rot["allowRotate"]=False
            for ep in list(self.eps):
                if self.can_place(ep,rot["length"],rot["height"],rot["width"]):
                    if self.check_support(ep["x"],ep["y"],ep["z"],rot["length"],rot["width"]):
                        if self.check_stack(ep,rot):
                            self.place(rot,ep); return True
        return False

def aggregate(items, cd):
    groups = {}
    for it in items: groups.setdefault(it["_tk"],[]).append(it)
    result = []
    for k, g in groups.items():
        s = g[0]
        small = s["length"]<cd["length"]/10 and s["height"]<cd["height"]/10 and s["width"]<cd["width"]/10 and len(g)>20
        if small:
            fx=int(cd["length"]//s["length"]); fz=int(cd["width"]//s["width"]); ipl=fx*fz
            if ipl>1:
                nb=len(g)//ipl; rem=len(g)%ipl
                for _ in range(nb):
                    result.append({"name":s["name"],"length":s["length"]*fx,"height":s["height"],"width":s["width"]*fz,
                        "weight":s["weight"]*ipl,"stackLimit":s["stackLimit"],"allowRotate":False,
                        "isAgg":True,"aggCnt":ipl,"_tk":k,"origL":s["origL"],"origH":s["origH"],"origW":s["origW"]})
                for i in range(rem): gi=g[nb*ipl+i]; gi["isAgg"]=False; gi["aggCnt"]=1; result.append(gi)
            else:
                for gi in g: gi["isAgg"]=False; gi["aggCnt"]=1; result.append(gi)
        else:
            for gi in g: gi["isAgg"]=False; gi["aggCnt"]=1; result.append(gi)
    return result

def run_packing(cargo, container, sup=75, agg=True):
    t0 = time.time()
    expanded = []
    for c in cargo:
        tk = f"{c['name']}_{c['length']}_{c['height']}_{c['width']}"
        for _ in range(c["quantity"]):
            expanded.append({"name":c["name"],"length":c["length"],"height":c["height"],"width":c["width"],
                "weight":c["weight"],"stackLimit":c.get("stackLimit",10),"allowRotate":c.get("allowRotate",False),
                "isAgg":False,"aggCnt":1,"_tk":tk,"origL":c["length"],"origH":c["height"],"origW":c["width"]})
    expanded.sort(key=lambda a:(-(1 if 50<=max(a["length"],a["height"],a["width"])<=500 else 0),-(a["length"]*a["height"]*a["width"])))
    if agg:
        expanded = aggregate(expanded, container)
        expanded.sort(key=lambda a:(1 if a.get("isAgg") else 0,-(a["length"]*a["height"]*a["width"])))

    packer = Packer(container, sup); unpacked = []
    for item in expanded:
        if not packer.try_place(item): unpacked.append(item)
    elapsed = round(time.time()-t0, 3)

    pc=sum(p["aggCnt"] for p in packer.packed); uc=sum(u.get("aggCnt",1) for u in unpacked); total=pc+uc
    cv=container["length"]*container["height"]*container["width"]
    uv=sum(p["l"]*p["h"]*p["w"] for p in packer.packed)
    cx=cz=tw=0.0
    for p in packer.packed: cx+=(p["x"]+p["l"]/2)*p["wt"]; cz+=(p["z"]+p["w"]/2)*p["wt"]; tw+=p["wt"]
    if tw:
        cx/=tw; cz/=tw
        ox=abs(cx-container["length"]/2)/(container["length"]/2)*100
        oz=abs(cz-container["width"]/2)/(container["width"]/2)*100
        cog=round(math.sqrt(ox*ox+oz*oz),1)
    else: cog=0

    ps={}; us={}
    for p in packer.packed: ps[p["name"]]=ps.get(p["name"],0)+p["aggCnt"]
    for u in unpacked: us[u["name"]]=us.get(u["name"],0)+u.get("aggCnt",1)

    clean = [{"name":p["name"],"l":p["l"],"h":p["h"],"w":p["w"],"wt":p["wt"],
              "x":p["x"],"y":p["y"],"z":p["z"],"isAgg":p["isAgg"],"aggCnt":p["aggCnt"],
              "stackLayer":p["stackLayer"],"stackLimit":p["stackLimit"],
              "origL":p["origL"],"origH":p["origH"],"origW":p["origW"]} for p in packer.packed]

    return {"container":container,"packed_items":clean,"packed_summary":ps,"unpacked_summary":us,
        "stats":{"packed_count":pc,"unpacked_count":uc,
            "pack_rate":round(pc/total*100,1) if total else 0,
            "space_utilization":round(uv/cv*100,1) if cv else 0,
            "actual_weight":round(packer.totalW,1),"max_weight":container["maxWeight"],
            "weight_utilization":round(packer.totalW/container["maxWeight"]*100,1) if container["maxWeight"] else 0,
            "calc_time":elapsed,"cog_offset":cog}}

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            ct = body.get("container_type", "40HC")
            if ct not in CONTAINERS: self._json(400, {"error": f"Unknown container: {ct}"}); return
            items = body.get("items", [])
            if not items: self._json(400, {"error": "No items provided"}); return
            result = run_packing(items, CONTAINERS[ct], body.get("support_ratio", 75), body.get("enable_aggregation", True))
            self._json(200, result)
        except Exception as e:
            self._json(500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(200); self._cors()
        self.send_header("Content-Length", "0"); self.end_headers()

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code); self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)
