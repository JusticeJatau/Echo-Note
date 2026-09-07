import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useAppTheme } from "../theme/ThemeProvider";

const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

function editorHtml(content, colors, fontSize, spellCheck) {
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:${colors.background};color:${colors.text};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
#editor{min-height:520px;padding:2px 0 150px;outline:none;font-size:${fontSize}px;line-height:1.7;caret-color:${colors.primary};white-space:pre-wrap;word-break:break-word}
.line{min-height:${Math.ceil(fontSize * 1.7)}px}.syntax{opacity:0;font-size:0;line-height:0;user-select:none}.heading{font-weight:750;line-height:1.35}.h1{font-size:${fontSize * 1.65}px}.h2{font-size:${fontSize * 1.38}px}.h3{font-size:${fontSize * 1.18}px}
.strong{font-weight:750}.em{font-style:italic}.strike{text-decoration:line-through;color:${colors.muted}}.code{font-family:monospace;background:${colors.raised};color:#60a5fa;border-radius:5px;padding:2px 4px}.link{color:${colors.primary};text-decoration:underline}.quote{color:${colors.muted};font-style:italic;border-left:3px solid ${colors.primary};padding-left:12px}.marker{display:inline-block;min-width:20px;color:${colors.muted}}
.codeblock{background:${colors.raised};padding:0 12px;font-family:monospace;color:#7dd3fc}.codeopen{border-radius:8px 8px 0 0;margin-top:8px;min-height:10px}.codeclose{border-radius:0 0 8px 8px;margin-bottom:8px;min-height:10px}
::selection{background:${colors.primary}55}
</style></head><body>
<div id="editor" contenteditable="true" spellcheck="${spellCheck ? "true" : "false"}"></div>
<script>
const editor=document.getElementById('editor');let raw=${safeJson(content)};let activeLine=Math.max(0,raw.split('\\n').length-1);let composing=false;
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const hide=s=>'<span class="syntax">'+s+'</span>';
function inline(value){let s=esc(value);s=s.replace(/\\*\\*(.+?)\\*\\*/g,(_,x)=>hide('**')+'<span class="strong">'+x+'</span>'+hide('**'));s=s.replace(/(^|[^*])\\*([^*\\n]+)\\*(?!\\*)/g,(_,p,x)=>p+hide('*')+'<span class="em">'+x+'</span>'+hide('*'));s=s.replace(/~~(.+?)~~/g,(_,x)=>hide('~~')+'<span class="strike">'+x+'</span>'+hide('~~'));s=s.replace(/\\x60([^\\x60]+)\\x60/g,(_,x)=>hide('&#96;')+'<span class="code">'+x+'</span>'+hide('&#96;'));s=s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,(_,label,url)=>hide('[')+'<span class="link">'+label+'</span>'+hide(']('+url+')'));return s}
function selectionOffset(){const sel=getSelection();if(!sel.rangeCount||!editor.contains(sel.anchorNode))return 0;const range=document.createRange();range.selectNodeContents(editor);range.setEnd(sel.anchorNode,sel.anchorOffset);return range.toString().length}
function restoreSelection(offset){const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let left=Math.max(0,offset),node;while((node=walker.nextNode())){if(left<=node.data.length){const range=document.createRange();range.setStart(node,left);range.collapse(true);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);return}left-=node.data.length}const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(range)}
function lineAt(offset){return raw.slice(0,offset).split('\\n').length-1}
function render(keep=true,desired=null){const offset=desired??(keep?selectionOffset():raw.length);const lines=raw.split('\\n');let inCode=false;editor.innerHTML=lines.map((line,index)=>{let body,cls='line';const active=index===activeLine;if(active){body=esc(line)||'<br>'}else if(/^\\s*\\x60\\x60\\x60/.test(line)){cls+=' codeblock '+(inCode?'codeclose':'codeopen');body=hide(esc(line))||'<br>';inCode=!inCode}else if(inCode){cls+=' codeblock';body=esc(line)||'<br>'}else{const heading=line.match(/^(#{1,6})\\s+/);const quote=line.match(/^>\\s+/);const list=line.match(/^(\\s*)([-*+] |\\d+\\. )/);if(heading){cls+=' heading h'+Math.min(3,heading[1].length);body=hide(esc(heading[0]))+inline(line.slice(heading[0].length))}else if(quote){cls+=' quote';body=hide(esc(quote[0]))+inline(line.slice(quote[0].length))}else if(list){const marker=/^\\d/.test(list[2])?list[2].trim():'•';body=esc(list[1])+hide(esc(list[2]))+'<span class="marker">'+marker+'</span>'+inline(line.slice(list[0].length))}else body=inline(line)||'<br>'}return '<div class="'+cls+'" data-line="'+index+'">'+body+'</div>'}).join('');restoreSelection(Math.min(offset,raw.length));sendHeight()}
function readRaw(){const lines=[...editor.querySelectorAll(':scope > .line')];return lines.length?lines.map(x=>x.innerText.replace(/\\n$/,'')).join('\\n'):editor.innerText.replace(/\\n$/,'')}
function send(type,extra={}){window.ReactNativeWebView.postMessage(JSON.stringify({type,...extra}))}
function sendHeight(){send('height',{height:Math.max(520,document.documentElement.scrollHeight)})}
editor.addEventListener('input',()=>{if(composing)return;const offset=selectionOffset();raw=readRaw();activeLine=lineAt(offset);send('change',{content:raw,selection:{start:offset,end:offset}});render(true)});
document.addEventListener('selectionchange',()=>{const sel=getSelection();if(!sel.anchorNode||!editor.contains(sel.anchorNode))return;const start=selectionOffset();let end=start;if(sel.rangeCount){const range=sel.getRangeAt(0).cloneRange();const before=document.createRange();before.selectNodeContents(editor);before.setEnd(range.endContainer,range.endOffset);end=before.toString().length}const next=lineAt(end);send('selection',{selection:{start:Math.min(start,end),end:Math.max(start,end)}});if(next!==activeLine&&!composing){activeLine=next;render(true)}});
editor.addEventListener('compositionstart',()=>composing=true);editor.addEventListener('compositionend',()=>{composing=false;raw=readRaw();render(true);send('change',{content:raw,selection:{start:selectionOffset(),end:selectionOffset()}})});
window.setEchoContent=(next,offset)=>{if(next===raw)return;raw=next;const target=Math.min(Number.isFinite(offset)?offset:raw.length,raw.length);activeLine=lineAt(target);render(false,target)};
render(false);
</script></body></html>`;
}

export function LiveLineEditor({ content, selection, onChangeText, onSelectionChange, fontSize = 16, spellCheck = true }) {
  const { colors } = useAppTheme();
  const ref = useRef(null);
  const latest = useRef(content);
  const [height, setHeight] = useState(520);
  const html = useMemo(() => editorHtml(content, colors, fontSize, spellCheck), [colors, fontSize, spellCheck]);
  useEffect(() => {
    if (content === latest.current) return;
    latest.current = content;
    ref.current?.injectJavaScript(`window.setEchoContent(${safeJson(content)},${selection?.start ?? content.length});true;`);
  }, [content]);
  return (
    <View style={[styles.container, { height, backgroundColor: colors.background }]}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        scrollEnabled={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        style={{ flex: 1, backgroundColor: colors.background }}
        onMessage={({ nativeEvent }) => {
          try {
            const message = JSON.parse(nativeEvent.data);
            if (message.type === "height") setHeight(Math.max(520, Math.min(12000, message.height)));
            if (message.type === "selection") onSelectionChange?.(message.selection);
            if (message.type === "change") {
              latest.current = message.content;
              onSelectionChange?.(message.selection);
              onChangeText(message.content);
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { width: "100%", minHeight: 520 } });
