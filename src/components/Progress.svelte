<script type="text/javascript">
	import Card from '../shared/Cards.svelte'
	import Project from './Projects.svelte'
	import Stands from '../shared/Stands.svelte'

	let bambooDescription=" You get an ergonomic stand made of natural bamboo. You've helped us launch our promotional campaign,and you’ll be added to a special Backer member list."
	let bambooAmount = 25
	let blackStandDescription = "You get a Black Special Edition computer stand and a personal thank you. You’ll be added to our Backer member list. Shipping is included."
	let blackAmount = 75
	let mahoganyStandEdition = "You get two Special Edition Mahogany stands, a Backer T-Shirt, and a personal thank you. You’ll be added to our Backer member list. Shipping is included."
	let mahoganyAmount =200 

	let totalAmount = 0
	let totalBackers = 0

	const addAmount = (e) =>{
		const Amount = e.detail
		totalAmount += Amount 
		totalBackers +=1


	}



	
</script>
<Card>
	<div class="progress">
		<div class="top">
			<div class="total-amount">
				<h3>${totalAmount}</h3>
				<p>of $10000 backed</p>
			</div>
			<hr class="uk-divider-vertical">
			<div class="backers">
				<h3>{totalBackers}</h3>
				<p>Total backers</p>
			</div>
			<hr class="uk-divider-vertical">
			<div class="days">
				<h3>25</h3>
				<p>days left</p>
			</div>
		</div>
		<div class="bottom">
			<progress id="js-progressbar" class="uk-progress" value={totalAmount} max={10000}></progress>	
		</div>	
	</div>
	<Project />
	<div class="projects-area">
			<Stands  standType={"Bamboo Stand"} pledge={"Pledge $25 or more"} description={bambooDescription} amount={bambooAmount} left ={45}  on:addAmount={addAmount}/>
			<Stands  standType={"Black Edition Stand"} pledge={"Pledge $75 or more"} description={blackStandDescription} amount={blackAmount} left ={50} on:addAmount={addAmount}/>
			<Stands  standType={"Mahogany Special Edition"} pledge={"Pledge $200 or more"} description={mahoganyStandEdition} amount={mahoganyAmount } left ={10} on:addAmount={addAmount}/>
		</div>
</Card>


<style type="text/css">
	.top{
		display: flex;
		align-items: center;
		justify-content: space-between;
		line-height: 0;
	}

	h3{font-weight: 700}
	p{color: hsl(0, 0%, 48%)}

	.bottom{padding-top:15px;}
	.uk-progress{
		/*background-color: hsl(176, 72%, 28%)*/
		height: 15px;
		}
	.projects-area{
		display: flex;
		flex-direction: column;
		gap:10px;
	}

	
</style>