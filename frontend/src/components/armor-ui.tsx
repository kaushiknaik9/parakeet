import { LoaderCircle, X } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DealBadgeStatus } from "@/types/armor";

export function Button({children,variant="primary",loading=false,className,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"success"|"danger"|"ghost";loading?:boolean}){
 return <button className={cn("ui-button",`ui-button--${variant}`,className)} disabled={loading||props.disabled} {...props}>{loading?<LoaderCircle size={16} className="animate-spin"/>:children}</button>
}
export function IconButton({label,className,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string}){return <button className={cn("icon-button",className)} aria-label={label} title={label} {...props}/>}
export function Card({children,className,onClick,style,disabled}: {children:ReactNode;className?:string;onClick?:()=>void;style?:CSSProperties;disabled?:boolean}){return <div className={cn("surface-card",onClick&&!disabled&&"surface-card--interactive",disabled&&"surface-card--disabled",className)} style={style} onClick={disabled?undefined:onClick}>{children}</div>}
export function StatusBadge({status}:{status:DealBadgeStatus|"AI Analysis"|"Fallback Analysis"}){const key=status.toLowerCase().replaceAll(" ","-");return <span className={`status status--${key}`}><span className="status__dot"/>{status}</span>}
export function Field({label,icon,error,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;icon?:ReactNode;error?:string}){return <label className="field"><span className="field__label">{label}</span><span className="field__control">{icon}<input {...props}/></span>{error&&<span className="field__error">{error}</span>}</label>}
export function Progress({value}:{value:number}){return <div className="progress"><span style={{width:`${value}%`}}/></div>}
export function Modal({title,description,children,onClose}:{title:string;description?:string;children:ReactNode;onClose:()=>void}){return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><div className="modal__head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div><IconButton label="Close" onClick={onClose}><X size={18}/></IconButton></div>{children}</div></div>}
export function EmptyState({title,body,action}:{title:string;body:string;action?:ReactNode}){return <div className="empty-state"><div className="empty-state__mark">A</div><h3>{title}</h3><p>{body}</p>{action}</div>}
export function Skeleton({className}:{className?:string}){return <div className={cn("skeleton",className)}/>}
