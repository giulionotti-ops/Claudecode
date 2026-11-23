"""Cut Neesmo's part out of the graphify graph into vega/graph.json (served at /api/graph) for the /graph page.
Run from the repo root after `graphify update .`:  python3 vega/tools/graph_json.py"""
import json, pathlib, collections
root = pathlib.Path(__file__).resolve().parents[2]
g = json.loads((root / "graphify-out/graph.json").read_text())
keep = lambda f: f.startswith("vega/") and "/vendor/" not in f
nodes = [n for n in g["nodes"] if keep(str(n.get("source_file", "")))]
ids = {n["id"] for n in nodes}
links = [{"source": l["source"], "target": l["target"], "relation": l.get("relation", "")}
         for l in g["links"] if l["source"] in ids and l["target"] in ids and l["source"] != l["target"]]
deg = collections.Counter([l["source"] for l in links] + [l["target"] for l in links])
out = {"nodes": [{"id": n["id"], "label": n.get("label", n["id"]), "file": n.get("source_file", ""),
                  "line": n.get("source_location", ""), "type": n.get("file_type", ""),
                  "group": n.get("community_name", ""), "deg": deg[n["id"]]} for n in nodes], "links": links}
# the front end isn't in graphify: add each page's functions and who calls whom, by name
import re
for page in sorted((root / "vega").glob("*.html")) + sorted((root / "vega/static").glob("*.html")):
    rel = str(page.relative_to(root)); src = page.read_text(errors="ignore").splitlines()
    fid = "page:" + rel; out["nodes"].append({"id": fid, "label": page.name, "file": rel, "line": "L1", "type": "page", "group": rel, "deg": 0})
    defs = [(i, m.group(1)) for i, l in enumerate(src) for m in [re.search(r"(?:async\s+)?function\s+(\w+)\s*\(|^\s*(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>", l)] if m and (m.group(1) or m.group(2))]
    defs = [(i, re.search(r"function\s+(\w+)|(?:const|let)\s+(\w+)", src[i]).group(1) or re.search(r"(?:const|let)\s+(\w+)", src[i]).group(1)) for i, _ in defs]
    names = {n for _, n in defs}
    for k, (i, n) in enumerate(defs):
        nid = f"{fid}#{n}"; end = defs[k + 1][0] if k + 1 < len(defs) else len(src)
        out["nodes"].append({"id": nid, "label": n + "()", "file": rel, "line": f"L{i + 1}", "type": "code", "group": rel, "deg": 0})
        out["links"].append({"source": fid, "target": nid, "relation": "defines"})
        body = "\n".join(src[i + 1:end])
        for m in sorted(names - {n}):
            if re.search(r"\b" + re.escape(m) + r"\s*\(", body): out["links"].append({"source": nid, "target": f"{fid}#{m}", "relation": "calls"})
ids = {n["id"] for n in out["nodes"]}
out["links"] = [l for l in out["links"] if l["target"] in ids]
deg = collections.Counter([l["source"] for l in out["links"]] + [l["target"] for l in out["links"]])
for n in out["nodes"]:
    n["deg"] = deg[n["id"]]
    f = root / n["file"]; i = int(str(n["line"]).lstrip("L").split("-")[0] or 1) - 1 if str(n["line"]).lstrip("L").split("-")[0].isdigit() else 0
    if f.is_file() and n["type"] != "page":
        n["code"] = "\n".join(f.read_text(errors="ignore").splitlines()[i:i + 12])[:900]
(root / "vega/graph.json").write_text(json.dumps(out, separators=(",", ":")))
print(len(out["nodes"]), "nodes", len(out["links"]), "links")
