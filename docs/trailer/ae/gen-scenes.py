"""Generates the 1920x1080 scene mocks that ae_build_scene_from_html turns into native AE layers.
Absolute px layout only, real plugin palette, Lucide icons, class-name hints for precomp grouping."""
import os, html as H
OUT = os.path.join(os.path.dirname(__file__), "html")
os.makedirs(OUT, exist_ok=True)

BG="#1e1e1e"; BG2="#262626"; BORDER="#3a3a3a"; TXT="#dadada"; MUTED="#9a9a9a"; FAINT="#6a6a6a"
PURPLE="#a882ff"; PURPLE_DIM="#3b3157"; GREEN="#44cf6e"; RED="#fb464c"; ACCENT="#7f6df2"
FONT="'Helvetica Neue', Helvetica, Arial, sans-serif"
MONO="Menlo, monospace"

def icon(paths, color, size=24, x=0, y=0, sw=2, fill=None):
    # The AE walker turns fill="none" into black; give icons an explicit fill matching their background.
    fill = fill or BG2
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{fill}" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:{x}px;top:{y}px">{paths}</svg>')
SPARK='<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>'
SEND='<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'
XICON='<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
CHECK='<path d="M20 6 9 17l-5-5"/>'
FILES='<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>'
SEARCH='<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'
SCISSORS='<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>'
COPY='<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
CLIP='<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'
USERCHECK='<path d="M16 11l2 2 4-4"/><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6"/>'
KEY='<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5"/>'
BOT='<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>'
TRASH='<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'
ALERT='<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>'
LAPTOP='<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>'
PHONE='<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>'

def rect(x,y,w,h,color,r=0,cls="",extra="",name=""):
    return f'<div class="{cls}" data-name="{name}" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{color};border-radius:{r}px;{extra}"></div>'
def text(x,y,w,s,size=22,color=TXT,weight=400,lh=None,cls="",font=FONT,name="",extra=""):
    lh = lh or round(size*1.55)
    return (f'<div class="{cls}" data-name="{name}" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;font-family:{font};font-size:{size}px;'
            f'font-weight:{weight};color:{color};line-height:{lh}px;white-space:pre-wrap;{extra}">{H.escape(s)}</div>')

TITLE="Trip planning – Lisbon"
P1="We land on Friday evening and stay until Tuesday. The apartment is in Alfama, a few minutes from the tram 28 stop."
SEL="Saturday we want to do the castle in the morning and then maybe walk down through the old streets to the river and get lunch somewhere there if we find a nice place and after that we could take the tram to Belém for the pastries."
P3="Sunday: day trip to Sintra (book Pena Palace tickets in advance)."
H2="Packing list"
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDIT_OUT=open(os.path.join(root,"outputs","1-edit-claude-code.txt")).read().strip()
INSERT_OUT=open(os.path.join(root,"outputs","2-insert-codex.txt")).read().strip()

# Note column geometry (1920 wide): editor area starts at x=440 (ribbon 64 + sidebar 300 + gutter), text column x=560..1520
NX, NW = 560, 960
Y_TITLE, Y_P1, Y_SEL, Y_P3, Y_H2 = 150, 260, 350, 520, 620

def shell(body_extra, status_html="", right=None, with_sidebar=True, title_y=None):
    parts=[]
    parts.append(rect(0,0,1920,1080,BG,name="bg"))
    parts.append(f'<div class="header top-bar" style="position:absolute;left:0;top:0;width:1920px;height:44px;background:{BG2}">'
                 + rect(18,15,14,14,"#ff5f57",7) + rect(40,15,14,14,"#febc2e",7) + rect(62,15,14,14,"#28c840",7)
                 + text(90,11,600,f"{TITLE} — My vault",16,FAINT) + '</div>')
    parts.append(f'<div class="sidebar nav" style="position:absolute;left:0;top:44px;width:64px;height:1036px;background:{BG2}">'
                 + icon(FILES,MUTED,26,19,20) + icon(SEARCH,MUTED,26,19,70) + icon(SPARK,PURPLE,26,19,120) + rect(63,0,1,1036,BORDER) + '</div>')
    if with_sidebar:
        files=["Daily notes","Projects",TITLE,"Reading list","Recipes"]
        s=f'<div class="sidebar pane" style="position:absolute;left:64px;top:44px;width:300px;height:1036px;background:{BG2}">'
        for i,f in enumerate(files):
            y=24+i*46
            if f==TITLE: s+=rect(14,y-8,272,40,"#3a3a3a",6)
            s+=text(28,y,260,f,19,TXT if f==TITLE else MUTED)
        s+=rect(299,0,1,1036,BORDER)+'</div>'
        parts.append(s)
        ex=364
    else: ex=64
    ew = (1920-340 if right else 1920)-ex
    parts.append(f'<div class="editor window" style="position:absolute;left:{ex}px;top:44px;width:{ew}px;height:1012px;background:{BG}">'
                 + rect(0,0,ew,48,BG2) + rect(20,10,260,38,BG,8) + text(40,17,240,TITLE,17,TXT) + rect(0,48,ew,1,BORDER) + '</div>')
    parts.append(text(NX,Y_TITLE if title_y is None else title_y,NW,TITLE,44,TXT,700,name="note-title"))
    parts += body_extra
    parts.append(rect(0,1050,1920,30,BG2,name="statusbar")+rect(0,1050,1920,1,BORDER))
    parts.append(text(1720,1057,180,"1,204 words",14,MUTED))
    if status_html: parts.append(status_html)
    if right: parts.append(right)
    return parts

def overlay(name, parts):
    doc=f'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;width:1920px;height:1080px;background:transparent;position:relative;overflow:hidden;font-family:{FONT}">' + "".join(parts) + '</body></html>'
    open(os.path.join(OUT,name+".html"),"w").write(doc)
    print("wrote overlay",name, len(doc))

def page(name, parts):
    doc=f'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;width:1920px;height:1080px;background:{BG};position:relative;overflow:hidden;font-family:{FONT}">' + "".join(parts) + '</body></html>'
    open(os.path.join(OUT,name+".html"),"w").write(doc)
    print("wrote",name, len(doc))

def note_plain(sel_layer=None, after=None):
    p=[text(NX,Y_P1,NW,P1,22,TXT,name="p1")]
    if sel_layer is not None: p+=sel_layer
    else: p.append(text(NX,Y_SEL,NW,SEL,22,TXT,name="selection"))
    p.append(text(NX,Y_P3,NW,P3,22,TXT,name="p3"))
    p.append(text(NX,Y_H2,NW,H2,30,TXT,700,name="h2"))
    if after: p+=after
    return p

# --- S0 / S1 base: selection highlighted --------------------------------------------------------
sel_hl=[rect(NX-8,Y_SEL-6,NW+16,3*34+12,"#3a3160",4,name="selection-highlight"), text(NX,Y_SEL,NW,SEL,22,TXT,name="selection")]
page("s0-cold-open", shell(note_plain()))

menu_x, menu_y = 1180, 470
menu=(f'<div class="menu popup" style="position:absolute;left:{menu_x}px;top:{menu_y}px;width:330px;height:262px;background:{BG2};border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.5)">'
      + rect(0,0,330,262,BORDER,10) + rect(1,1,328,260,BG2,9)
      + icon(SCISSORS,MUTED,18,20,20) + text(52,16,200,"Cut",17,TXT)
      + icon(COPY,MUTED,18,20,58) + text(52,54,200,"Copy",17,TXT)
      + icon(CLIP,MUTED,18,20,96) + text(52,92,200,"Paste",17,TXT)
      + rect(12,132,306,1,BORDER)
      + rect(8,142,314,44,"#3a3a3a",6,name="menu-hover") + icon(SPARK,PURPLE,18,20,155) + text(52,151,260,"Ask AI to edit selection",17,TXT,500,name="menu-ai")
      + rect(12,196,306,1,BORDER) + icon(COPY,MUTED,18,20,214) + text(52,210,260,"Copy link to block",17,TXT) + '</div>')
page("s1-note-selected", shell(note_plain(sel_layer=sel_hl)))
overlay("ov-menu-edit", [menu])

box_x, box_y = NX-10, Y_SEL+3*34+16
box=(f'<div class="popup prompt-box" style="position:absolute;left:{box_x}px;top:{box_y}px;width:640px;height:118px;background:{BG};border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,0.45)">'
     + rect(0,0,640,118,BORDER,12) + rect(1,1,638,116,BG,11)
     + icon(SPARK,PURPLE,18,16,16,fill=BG) + text(42,14,330,"“Saturday we want to do the castle in the…”",15,MUTED,extra="font-style:italic;white-space:nowrap;overflow:hidden")
     + text(380,15,220,"Claude Code (subscription)",13,FAINT,extra="white-space:nowrap") + icon(XICON,MUTED,16,610,16,fill=BG)
     + rect(14,50,566,52,"#1a1a1a",8,name="prompt-input") + rect(15,51,564,50,"#1a1a1a",7) + rect(14,50,566,52,BORDER,8) + rect(15,51,564,50,"#1a1a1a",7)
     + text(28,64,540,"Split into short sentences and make it a bullet list",18,TXT,name="prompt-text")
     + rect(590,52,44,48,ACCENT,8,name="send-btn") + icon(SEND,"#ffffff",20,602,66,fill=ACCENT) + '</div>')
overlay("ov-box-edit", [box])

# --- S2 generating: real Claude Code output streaming in ------------------------------------------
out_lines=EDIT_OUT.count("\n")+1
gen=[rect(NX-8,Y_SEL-6,NW+16,out_lines*34+12,"#332c4f",4,name="generating-highlight"),
     rect(NX-8,Y_SEL+out_lines*34+3,NW+16,2,PURPLE,1,name="generating-underline"),
     text(NX,Y_SEL,NW,EDIT_OUT,22,TXT,name="streamed-output"),
     f'<div class="badge chip" style="position:absolute;left:{NX+520}px;top:{Y_SEL+out_lines*34-30}px;width:300px;height:34px;background:{PURPLE_DIM};border-radius:17px">'
     + rect(10,8,18,18,"#00000000",9) + rect(10,8,18,18,PURPLE,9,name="spinner-ring") + rect(13,11,12,12,PURPLE_DIM,6) + rect(16,6,8,8,PURPLE_DIM,4,name="spinner-gap")
     + text(36,7,260,"Claude Code (subscription)",15,PURPLE,500,extra="white-space:nowrap",name="badge-label") + '</div>']
status=icon(SPARK,PURPLE,14,1420,1058,fill=BG2)+text(1440,1056,300,"Claude Code (subscription) editing…",14,PURPLE,name="status-text")
page("s2-generating", shell([text(NX,Y_P1,NW,P1,22,TXT,name="p1")]+gen+[text(NX,Y_P3+ (out_lines-3)*34,NW,P3,22,TXT,name="p3"), text(NX,Y_H2+(out_lines-3)*34,NW,H2,30,TXT,700,name="h2")], status))

# --- S3 write at cursor: real Codex output under Packing list --------------------------------------
SCROLL = -150   # the editor has scrolled down a bit so the list fits
Y2 = Y_SEL + out_lines*34 + 40 + SCROLL   # p3 y after the edit
Y2H = Y2 + 70
ins_lines=INSERT_OUT.count("\n")+1
LH2=27
scrolled=[text(NX,Y_P1+SCROLL,NW,P1,22,TXT,name="p1"), text(NX,Y_SEL+SCROLL,NW,EDIT_OUT,22,TXT,name="edited"), text(NX,Y2,NW,P3,22,TXT,name="p3"), text(NX,Y2H,NW,H2,30,TXT,700,name="h2")]
ins=scrolled+[
     rect(NX,Y2H+56,3,26,PURPLE,2,name="ai-caret"),
     text(NX,Y2H+52,NW,INSERT_OUT,19,TXT,lh=LH2,name="inserted-output"),
     f'<div class="badge chip" style="position:absolute;left:{NX+600}px;top:{Y2H+52+ins_lines*LH2-30}px;width:240px;height:34px;background:{PURPLE_DIM};border-radius:17px">'
     + rect(10,8,18,18,PURPLE,9,name="spinner-ring") + rect(13,11,12,12,PURPLE_DIM,6) + rect(16,6,8,8,PURPLE_DIM,4)
     + text(36,7,200,"Codex (subscription)",15,PURPLE,500,extra="white-space:nowrap",name="badge-label") + '</div>']
menu2=(f'<div class="menu popup" style="position:absolute;left:{NX+300}px;top:{Y2H+70}px;width:330px;height:262px;background:{BG2};border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.5)">'
      + rect(0,0,330,262,BORDER,10) + rect(1,1,328,260,BG2,9)
      + icon(SCISSORS,MUTED,18,20,20) + text(52,16,200,"Cut",17,TXT) + icon(COPY,MUTED,18,20,58) + text(52,54,200,"Copy",17,TXT) + icon(CLIP,MUTED,18,20,96) + text(52,92,200,"Paste",17,TXT)
      + rect(12,132,306,1,BORDER) + rect(8,142,314,44,"#3a3a3a",6,name="menu-hover") + icon(SPARK,PURPLE,18,20,155) + text(52,151,260,"Ask AI to write here",17,TXT,500,name="menu-ai")
      + rect(12,196,306,1,BORDER) + icon(COPY,MUTED,18,20,214) + text(52,210,260,"Copy link to block",17,TXT) + '</div>')
box2=(f'<div class="popup prompt-box" style="position:absolute;left:{NX-10}px;top:{Y2H+70}px;width:640px;height:118px;background:{BG};border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,0.45)">'
     + rect(0,0,640,118,BORDER,12) + rect(1,1,638,116,BG,11)
     + icon(SPARK,PURPLE,18,16,16,fill=BG) + text(42,14,330,"Write at cursor",15,MUTED) + text(380,15,220,"Codex (subscription)",13,FAINT,extra="white-space:nowrap") + icon(XICON,MUTED,16,610,16,fill=BG)
     + rect(14,50,566,52,BORDER,8) + rect(15,51,564,50,"#1a1a1a",7)
     + text(28,64,540,"Add a packing list for 4 days of mild weather, walking a lot",18,TXT,name="prompt-text")
     + rect(590,52,44,48,ACCENT,8,name="send-btn") + icon(SEND,"#ffffff",20,602,66,fill=ACCENT) + '</div>')
page("s3-write-at-cursor", shell(ins, icon(SPARK,PURPLE,14,1420,1058,fill=BG2)+text(1440,1056,300,"Codex (subscription) editing…",14,PURPLE,name="status-text"), title_y=-200))
page("s3-note-scrolled", shell(scrolled+[rect(NX,Y2H+56,2,26,TXT,1,name="text-cursor")], title_y=-200))
overlay("ov-menu-write", [menu2])
overlay("ov-box-write", [box2])

# --- S4 edits panel -------------------------------------------------------------------------------
PX=1580; PW=340
def card(y, h, status_icon, color, instr, meta, open_body=""):
    instr = instr if len(instr) <= 34 else instr[:33] + "…"
    meta = meta if len(meta) <= 46 else meta[:45] + "…"
    s=f'<div class="card list-item" style="position:absolute;left:0;top:{y}px;width:{PW}px;height:{h}px">'
    s+=rect(0,h-1,PW,1,BORDER)
    if status_icon=="spinner": s+=rect(14,16,16,16,PURPLE,8,name="spin")+rect(17,19,10,10,BG2,5)+rect(20,13,7,7,BG2,3)
    else: s+=icon(status_icon,color,16,14,15)
    s+=text(42,12,286,instr,15,TXT,500,extra="white-space:nowrap;overflow:hidden")
    s+=text(42,36,286,meta,12,FAINT,extra="white-space:nowrap;overflow:hidden")
    s+=open_body+'</div>'
    return s
import textwrap
def wrap(t, n=34):
    return "\n".join("\n".join(textwrap.wrap(l, n)) if l.strip() else "" for l in t.split("\n"))
def section(y,title,body,size=12,lh=17):
    body=wrap(body)
    lines=body.count("\n")+1
    h=lines*lh+20
    return (text(42,y,280,title.upper(),11,MUTED,500,extra="letter-spacing:0.06em") + rect(42,y+20,284,h,"#1a1a1a",5)
            + text(52,y+30,264,body,size,TXT,font=MONO,lh=lh), h+30)
o1=EDIT_OUT; th="The passage is one run-on sentence with four stops. Keep the order (castle, old streets, lunch, Belém), drop the hedging, and format as a Markdown list to match the note."
body=""; y=64
s_,h_=section(y,"Original",SEL); body+=s_; y+=h_
s_,h_=section(y,"Output",o1); body+=s_; y+=h_
s_,h_=section(y,"Thinking",th); body+=s_; y+=h_
panel=(f'<div class="panel sidebar" style="position:absolute;left:{PX}px;top:44px;width:{PW}px;height:1006px;background:{BG2}">' + rect(0,0,1,1006,BORDER)
       + icon(SPARK,PURPLE,16,14,12) + text(38,10,200,"AI edits",13,MUTED) + rect(0,36,PW,1,BORDER)
       + text(16,50,200,"AI edits",16,TXT,600) + icon(TRASH,MUTED,16,306,50) + rect(0,80,PW,1,BORDER)
       + '<div class="list" style="position:absolute;left:0;top:82px;width:340px;height:900px">'
       + card(0,64,"spinner",PURPLE,"Add a packing list for 4 days of mild weather, walking a lot","Codex (subscription) · Trip planning – Lisbon · 14:32")
       + card(64,y+10,CHECK,GREEN,"Split into short sentences and make it a bullet list","Claude Code (subscription) · Trip planning – Lisbon · 14:31 · 4.8s",body)
       + card(64+y+10,64,CHECK,GREEN,"Fix spelling and grammar","Claude (API key) · Reading list · 13:58 · 3.1s")
       + card(64+y+74,64,ALERT,RED,"Translate to Portuguese","Hermes Agent · Recipes · 13:40 · 0.8s")
       + '</div></div>')
page("s4-edits-panel", shell(scrolled+[text(NX,Y2H+52,NW,INSERT_OUT,19,TXT,lh=LH2,name="inserted")], right=panel, title_y=-200))

# --- S5 compatibility (void, no app chrome) --------------------------------------------------------
def void_page(name, parts):
    page(name, [rect(0,0,1920,1080,"#121214",name="void")]+parts)
chips=["Claude Code","Codex","Anthropic API","OpenAI","Hermes Agent","Ollama · LM Studio","ACP agents"]
import math
cx,cy=960,540
p=[rect(cx-70,cy-70,140,140,ACCENT,34,name="plugin-tile"), icon(SPARK,"#ffffff",72,cx-36,cy-36,sw=1.8,fill=ACCENT)]
for i,c in enumerate(chips):
    a=-math.pi/2 + i*2*math.pi/len(chips); r=330
    x=cx+math.cos(a)*r; yv=cy+math.sin(a)*r; w=len(c)*11+44
    p.append(f'<div class="chip item" data-name="chip-{i}" style="position:absolute;left:{x-w/2:.0f}px;top:{yv-24:.0f}px;width:{w:.0f}px;height:48px">'
             + rect(0,0,w,48,BORDER,24)+rect(1,1,w-2,46,BG2,23)+text(0,12,w,c,19,TXT,500,extra="text-align:center;white-space:nowrap")+'</div>')
p.append(text(120,90,900,"Your subscription. Or any agent.",52,"#ffffff",700,name="caption"))
void_page("s5-agents", p)
dev=[icon(LAPTOP,PURPLE,260,420,400,sw=1.2,fill="#121214"), icon(PHONE,PURPLE,200,1240,430,sw=1.2,fill="#121214"),
     '<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" stroke="'+PURPLE+'" stroke-width="4" stroke-dasharray="14 12" style="position:absolute;left:0;top:0"><path d="M700 540 C 900 540, 1040 540, 1240 540"/></svg>',
     rect(880,500,180,44,PURPLE_DIM,22,name="bridge-pill"), text(880,509,180,"bridge",20,PURPLE,600,extra="text-align:center"),
     text(120,90,900,"Desktop and phone.",52,"#ffffff",700,name="caption"), text(120,160,900,"one bridge · no keys on the phone",26,MUTED,name="subcaption")]
void_page("s5b-devices", dev)

# --- S6 wizard (3 modals) ------------------------------------------------------------------------
def modal(name, title_q, cards, footer_status=""):
    mx,my,mw,mh=560,300,800,470
    s=[rect(0,0,1920,1080,"#0f0f10",name="void")]
    s.append(f'<div class="modal dialog" style="position:absolute;left:{mx}px;top:{my}px;width:{mw}px;height:{mh}px">'
             + rect(0,0,mw,mh,BORDER,16) + rect(1,1,mw-2,mh-2,BG,15) + icon(XICON,MUTED,20,mw-44,24,fill=BG)
             + text(36,30,700,"Set up Notekit Edit",28,TXT,600) + text(36,80,700,title_q,20,MUTED)
             + "".join(cards) + footer_status
             + rect(mw-300,mh-76,110,44,"#333",8)+text(mw-300,mh-64,110,"Back",17,TXT,extra="text-align:center")
             + rect(mw-170,mh-76,134,44,ACCENT,8,name="cta")+text(mw-170,mh-64,134,"Continue",17,"#ffffff",600,extra="text-align:center") + '</div>')
    page(name,s)
def wcard(x,y,w,h,ic,title,desc,selected):
    return (f'<div class="card tile" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px">'
            + rect(0,0,w,h,PURPLE if selected else BORDER,12) + rect(2 if selected else 1,2 if selected else 1,w-(4 if selected else 2),h-(4 if selected else 2),BG2,11)
            + icon(ic,PURPLE,26,20,22) + text(58,20,w-80,title,20,TXT,600) + text(58,52,w-80,desc,15,MUTED,lh=22) + '</div>')
modal("s6a-wizard-vendor","Which AI do you want to use for editing?",[wcard(36,130,350,200,SPARK,"Claude","Anthropic's Claude via Claude Code or the Anthropic API. Recommended.",True), wcard(414,130,350,200,BOT,"Codex","OpenAI's models via the Codex CLI or the OpenAI API.",False)])
modal("s6b-wizard-access","How do you access Claude?",[wcard(36,130,350,200,USERCHECK,"Claude subscription","Uses Claude Code installed on this computer and its existing login (Claude Pro/Max). No API key needed.",True), wcard(414,130,350,200,KEY,"API key","Pay-as-you-go via the Anthropic API. You'll enter an API key next.",False)])
modal("s6c-wizard-done","Nothing to enter: the plugin runs the Claude Code CLI on this computer and reuses its login.",[],
      rect(36,150,728,70,"#1f2b22",10)+icon(CHECK,GREEN,24,54,173,fill="#1f2b22")+text(90,164,660,"2.1.236 (Claude Code); logged in via claude.ai",20,GREEN,500)
      + text(36,250,700,"Set up in ten seconds.",40,TXT,700,name="caption"))

# --- S7 outro -------------------------------------------------------------------------------------
void_page("s7-outro",[rect(cx-80,300,160,160,ACCENT,40,name="logo-tile"), icon(SPARK,"#ffffff",84,cx-42,338,sw=1.8,fill=ACCENT),
    text(0,500,1920,"Notekit Edit",92,"#ffffff",700,extra="text-align:center;letter-spacing:-0.02em",name="wordmark"),
    text(0,630,1920,"Free in Obsidian community plugins",30,MUTED,extra="text-align:center",name="tagline"),
    text(0,690,1920,"by pocketcorp · pocketcorp.agency",24,FAINT,extra="text-align:center",name="url")])
