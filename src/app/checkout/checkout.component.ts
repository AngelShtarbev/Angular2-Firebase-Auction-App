import { Component, OnInit, Renderer, OnDestroy } from '@angular/core';
import { AngularFire, AuthProviders, AuthMethods,FirebaseListObservable } from 'angularfire2';
import { Router } from '@angular/router';
import { moveIn, fallIn, moveInLeft } from '../router.animations';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/toPromise';
import { Subscription } from "rxjs/Subscription";

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
  animations: [moveIn(), fallIn(), moveInLeft()],
  host: {'[@moveIn]': ''}
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private name: any;
  private checkout: FirebaseListObservable<any>;
  private history: FirebaseListObservable<any>;
  private checkout_total: number;
  private checkout_items_count: number;
  private checkout_key: any;
  private subscriptions: Array<Subscription> = [];
  private globalListener: any;
  private imagesString : any;
  private imagesArray : Array<String> = [];

  constructor(private af: AngularFire, private router: Router, private renderer: Renderer, private http: Http) {

    this.af.auth.subscribe(auth => {
      if(auth) {
        this.name = auth;
      }
    });

    this.checkout = this.af.database.list('/checkout', {
       query: {
          orderByChild: 'name',
          equalTo: this.name.auth.displayName,
          limitToFirst: 1
       }
   });

   this.history = this.af.database.list('/history', {
       preserveSnapshot: true,
       query: {
         orderByChild: 'winner',
         equalTo: this.name.auth.displayName,
       }
   });
 
    

   this.subscriptions.push(this.checkout.subscribe( items => items.forEach(item => this.checkout_total = item.items_total)));
   this.subscriptions.push(this.checkout.subscribe( items => items.forEach(item => this.checkout_items_count = item.items_count)));
   this.subscriptions.push(this.checkout.subscribe( bids => bids.forEach(item => this.checkout_key = item.$key)));
   this.subscriptions.push(this.checkout.subscribe( items => items.forEach(item => this.imagesString = (item.items_names.slice(9,item.items_names.length)))));
  }

   buyStripe() {
     var buyer_name = this.name.auth.displayName;
     var items_count = this.checkout_items_count;
     var items_total = this.checkout_total;
     var checkout_key = this.checkout_key;
     var redirect = this.router;
     var http = this.http;


     var completed = this.af.database.list('/completed_purchases');
     var remove_checkout = this.checkout;
     var remove_history = this.history; 

     var handler = (<any>window).StripeCheckout.configure({
      key: 'pk_test_IC36JeFDeThQHEBaPqg5HkWF',
      locale: 'auto',
      token: function (token: any) {
        if(token.id) {

         var params = `amount=${(items_total*100)}&currency=usd&source=${token.id}&description=Payment`;
         var headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer sk_test_qBt7bX04VlCfj2gpAKIW4TO6' });
         var options = new RequestOptions({ headers: headers });

         http.post('https://api.stripe.com/v1/charges', params, options)
            .toPromise()
            .then((res) => {
                //console.log(res.json().status);
                completed.push({ buyer_name: buyer_name, items_count: items_count, items_total: items_total, payment_type: 'Stripe Standard Payment' });
                remove_history.subscribe( items =>{ items.forEach(item => { item.ref.remove();});}, error => {} );
                remove_checkout.remove(checkout_key);

                redirect.navigateByUrl('/rooms');
            })
            .catch((error) => {
                console.log(error.message);
          });
        }
      }
    });

    handler.open({
      name: 'Bidding App',
      description: 'Test Checkout Process',
      zipCode: true,
      shippingAddress: true,
      billingAddress: true,
      amount: (items_total*100),
      image: "https://stripe.com/img/documentation/checkout/marketplace.png"
    });

    this.globalListener = this.renderer.listenGlobal('window', 'popstate', () => {
      handler.close();
    });
  }

  buyPayPal() {
    var buyer_name = this.name.auth.displayName;
    var items_count = this.checkout_items_count;
    var items_total = this.checkout_total;
    var checkout_key = this.checkout_key;
    var redirect = this.router;

    var completed = this.af.database.list('/completed_purchases');
    var remove_checkout = this.checkout;
    var remove_history = this.history;

    (<any>window).paypal.Button.render({
        env: 'sandbox',
        client: {
            sandbox: 'AUch3HTBx7a3Gpo-goTZrud3wSmSOscXUKxTNw9ekhQpUSUS_Mzj9ZtS5oHsRWBdHjP8TMGWf2LIM0TF'
        },
        commit: true,
        payment: function() {
            return (<any>window).paypal.rest.payment.create(this.props.env, this.props.client, {
                transactions: [
                    {
                        amount: { total: items_total, currency: 'USD' }
                    }
                ]
            });
        },
        onAuthorize: function(data, actions) {
            return actions.payment.execute().then(function() {

           completed.push({ buyer_name: buyer_name, items_count: items_count, items_total: items_total, payment_type: 'PayPal Standard Payment' });
           remove_history.subscribe( items =>{ items.forEach(item => { item.ref.remove();});}, error => {} );
           remove_checkout.remove(checkout_key);
                
          redirect.navigateByUrl('/rooms');
        });
      }

    }, '#paypal-button-container');
    return false;
  }

  ngOnInit() {}

  ngOnDestroy() {
   this.subscriptions.forEach((subscription: Subscription) => {
          subscription.unsubscribe();
     });
  }

}
