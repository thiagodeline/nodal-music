import type {PublicPlan} from '@/components/billing/PlanCards'
import PlatformStrip from './PlatformStrip'
import EditorialFeatures from './EditorialFeatures'
import EditorialPlans from './EditorialPlans'
import EditorialFAQ from './EditorialFAQ'
export default function LandingBelowHero({plans,checkoutReady,videoUrl}:{plans:PublicPlan[];checkoutReady:boolean;videoUrl:string|null}){
 return <><PlatformStrip/><EditorialFeatures videoUrl={videoUrl}/>{plans.length>1&&<EditorialPlans plans={plans} checkoutReady={checkoutReady}/>}<EditorialFAQ/></>
}
