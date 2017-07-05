import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFire, AuthProviders, AuthMethods,FirebaseListObservable } from 'angularfire2';
import { Router } from '@angular/router';
import { moveIn, fallIn, moveInLeft } from '../router.animations';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.css'],
  animations: [moveIn(), fallIn(), moveInLeft()],
  host: {'[@moveIn]': ''}
})

export class RoomsComponent implements OnInit, OnDestroy {
  private name: any;
  private bidder_name: any;
  private sub: any;
  private bids: FirebaseListObservable<any>;
  private checkout: FirebaseListObservable<any>;
  private product: FirebaseListObservable<any>;
  private checkout_count: number;
  private products_data: number;
  private count_bids: number;
  private bids_total: number = 0;
  private products_imgs: any;
  private products_names: any;
  private checkout_key: any;
  private subscriptions: Array<Subscription> = [];
  
  constructor(private af: AngularFire, private router: Router) {
   
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
 
   this.bids = this.af.database.list('/history', {
      query: {
        orderByValue: this.name.auth.displayName,
      }
      
   });

   this.product = this.af.database.list('/products', {
      query: {
        limitToLast: 1
      } 
   });
    
    this.subscriptions.push(this.product.map( list => list.length).subscribe(length => this.products_data = length));
    this.subscriptions.push(this.bids.map( list => list.length).subscribe(length => this.count_bids = length ));
    this.subscriptions.push(this.bids.subscribe( bids => bids.forEach(item => this.bids_total += item.bid)));
    this.subscriptions.push(this.checkout.map( list => list.length).subscribe(length => this.checkout_count = length));
    this.subscriptions.push(this.bids.subscribe( bids => bids.forEach(item => this.products_names += item.product_name)));
    this.subscriptions.push(this.bids.subscribe( bids => bids.forEach(item => this.products_imgs += item.product_img)));
    this.subscriptions.push(this.checkout.subscribe( bids => bids.forEach(item => this.checkout_key = item.$key)));     
 }

  ngOnInit() {
  }

  logout() {
     this.af.auth.logout();
     console.log('Чао, грабадавър!');
     this.router.navigateByUrl('/login');
   }

   ngOnDestroy() {
     this.subscriptions.forEach((subscription: Subscription) => {
            subscription.unsubscribe();
     });
   }

  roomOne() {
     this.router.navigateByUrl('/members');
  }
 
  cart() {
    if(this.checkout_count) {
      this.checkout.update(this.checkout_key,
          { 
            name: this.name.auth.displayName, 
            items_count: this.count_bids, 
            items_total: this.bids_total, 
            items_names: this.products_names, 
            items_imgs: this.products_imgs
          }
       );
      this.router.navigate(['/checkout']); 
    }
    else {
      this.checkout.push(
        { 
          name: this.name.auth.displayName, 
          items_count: this.count_bids, 
          items_total: this.bids_total, 
          items_names: this.products_names, 
          items_imgs: this.products_imgs
        }
      );
      this.router.navigate(['/checkout']);
    }  
  }

}
