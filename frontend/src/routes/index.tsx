import { createFileRoute } from "@tanstack/react-router";
import ArmorApp from "@/components/ArmorApp";

export const Route = createFileRoute("/")({
 head:()=>({meta:[
  {title:"Armor — Deal Intelligence"},
  {name:"description",content:"Turn business conversations into verified agreements and track every resulting financial obligation."},
  {property:"og:title",content:"Armor — Deal Intelligence"},
  {property:"og:description",content:"Turn business conversations into verified agreements and accountable business action."},
  {property:"og:type",content:"website"},
  {name:"twitter:card",content:"summary_large_image"},
 ]}),component:ArmorApp,
});
