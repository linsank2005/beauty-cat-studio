"""Apply this reviewed visual revision from its preserved baseline; narration/time remain fixed."""
from pathlib import Path
import copy,json
ROOT=Path(__file__).resolve().parents[1]
base=json.loads((ROOT/'episodes/DEMO/revisions/style-v1/episode.json').read_text(encoding='utf-8-sig'))
ep=copy.deepcopy(base);ep['visualVersion']='2.0'
ink='#493d38';font='KaiTi, STKaiti, Microsoft YaHei, sans-serif'
def layer(scene,id):return next(l for l in scene['layers'] if l['id']==id)
def text_style(scene):
    for l in scene['layers']:
        if l['kind']=='text':l.update(fontFamily=font,fontWeight=700,color=ink,letterSpacing=2)

s=ep['scenes'][0];s['art']={'variant':'vanity','appearAt':'E02','fadeSeconds':.85}
s['initialState']='前2.4秒沿用猫的原绘出；其后纸感画框、窗光、地面、镜柜与洗手台共同建立梳妆角。'
s['layers']=[layer(s,'cat-start'),{'id':'vanity-setup','kind':'image','x':1010,'y':117,'width':800,'height':800,'src':'props/style-v2/vanity.png','showAt':'E02','reveal':'wipe','revealSeconds':.85},layer(s,'question')]
s['beats'][1]['action']='手绘镜柜、洗手台与房间基底一起出现'
text_style(s);layer(s,'question').update(x=815,y=140,fontSize=112,color='#a36176')

s=ep['scenes'][1];s['background']='#fff8f1';s['art']={'variant':'thoughts'}
s['initialState']='猫仍在左侧；右侧柔和的脑内云团里，手绘清单纸签按原事件逐项累积，纸色和小图标统一。'
positions=[(855,227,366,120,-4),(1310,230,377,125,3),(865,378,375,123,2),(1300,384,372,124,-3),(853,527,378,123,-2),(1314,536,388,124,3),(863,677,380,121,3),(1297,686,410,140,-3)]
icons=['roller','moon','shirt','nail','brow','shoe','bag','redo']
colors=['#f9f2df','#f4e9e6','#ebefdf','#f9f2df','#f4e9e6','#f9f2df','#ebefdf','#e4b5c1']
for i,(x,y,w,h,rot) in enumerate(positions,1):
    card=layer(s,f'task{i}');card.update(x=x,y=y,width=w,height=h,rotation=rot,shape='note',fill=colors[i-1],color=ink,strokeWidth=3.5,doodle=icons[i-1],noteIndex=i)
    label=layer(s,f'task{i}-label');label.update(x=x+99,y=y+(h-64)/2,width=w-135,fontSize=50 if i==8 else 53,rotation=rot)
text_style(s);layer(s,'project-count').update(x=855,y=80,width=910,fontSize=74)
s['layers'].insert(2,{'id':'task-title-rule','kind':'path','x':902,'y':166,'width':850,'height':40,'path':'M10 23 Q243 8 805 23','color':'#b98b8d','strokeWidth':4,'showAt':'E06','reveal':'draw','revealSeconds':.45})

s=ep['scenes'][2];s['art']={'variant':'compare'}
s['initialState']='同一纸面中用鼠尾草与暖玫瑰两块淡色区比较洗手台和工地；素材均用统一的手绘墨线与填色。'
layer(s,'sink-compare').update(x=90,y=285,width=550,height=550,src='props/style-v2/vanity.png',reveal='wipe',revealSeconds=.7)
layer(s,'crane').update(x=1248,y=258,width=600,height=600,src='props/style-v2/construction.png')
text_style(s);layer(s,'sink-label').update(x=100,y=112,width=530,fontSize=72)
layer(s,'crane-label').update(x=1260,y=112,width=540,fontSize=72,color='#a46376')
layer(s,'cross').update(x=1340,y=283,color='#b46776',strokeWidth=18)

s=ep['scenes'][3];s['background']='#fff8f1';s['art']={'variant':'focus'}
s['initialState']='玫瑰粉笔刷色块围住猫的近景，鼠尾草色块托住单张折角清单；保持已有抬爪姿态和梳子轨迹。'
layer(s,'cat-groom').update(x=130,y=135,width=810)
layer(s,'one-task').update(x=1020,y=290,width=680,height=195,shape='note',fill='#fff8e9',color=ink,strokeWidth=4,doodle='roller')
text_style(s);layer(s,'one-label').update(x=1138,y=343,width=470,fontSize=64)
layer(s,'comb').update(x=630,y=590,width=230,height=100,rotation=-25,src='props/style-v2/comb.svg',motion=[{'at':'E17','x':520,'y':245,'rotation':25},{'at':'E19','x':870,'y':660,'rotation':-12}])
layer(s,'checkmark').update(x=1535,y=293,width=170,height=160,strokeWidth=13,color='#758a69')
layer(s,'later-label').update(x=1040,y=620,width=700,fontSize=53,color='#93766f')

s=ep['scenes'][4];s['art']={'variant':'exit'}
s['initialState']='同一纸感房间和柔和窗光，猫保持原坐姿得意表情；新手绘门口、挂包围巾与地垫完成出门处境。'
layer(s,'cat-end').update(y=155)
layer(s,'door').update(x=1070,y=184,width=730,height=730,src='props/style-v2/entry.png',revealSeconds=.85)
text_style(s);layer(s,'still-me').update(x=190,y=106,width=600,fontSize=70)
layer(s,'done').update(x=1100,y=87,width=650,fontSize=75,color='#a16178')
layer(s,'direction').update(color='#75685a',strokeWidth=8)

assert ep['narration']==base['narration'] and ep['duration']==base['duration']
assert ep['scenes'][0]['layers'][0]==base['scenes'][0]['layers'][0]
assert [[(b['id'],b['narrationId'],b['at']) for b in s['beats']] for s in ep['scenes']]==[[(b['id'],b['narrationId'],b['at']) for b in s['beats']] for s in base['scenes']]
(ROOT/'episodes/DEMO/episode.json').write_text(json.dumps(ep,ensure_ascii=False,indent=2),encoding='utf-8')
print('Visual v2 applied. Original narration, all 23 event times, total duration and opening cat layer preserved.')
