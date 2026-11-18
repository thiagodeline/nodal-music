import type {PublicPlan} from '@/components/billing/PlanCards'
import PlatformStrip from './PlatformStrip'
import EditorialFeatures from './EditorialFeatures'
import EditorialPlans from './EditorialPlans'
import EditorialFAQ from './EditorialFAQ'
export default function LandingBelowHero({plans,checkoutReady}:{plans:PublicPlan[];checkoutReady:boolean}){
 return <><PlatformStrip/><EditorialFeatures/>{plans.length>1&&<EditorialPlans plans={plans} checkoutReady={checkoutReady}/>}<EditorialFAQ/></>
}
