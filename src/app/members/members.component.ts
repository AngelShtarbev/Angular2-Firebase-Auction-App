import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AngularFire, AuthProviders, AuthMethods,FirebaseListObservable } from 'angularfire2';
import { Router } from '@angular/router';
import { moveIn, fallIn, moveInLeft } from '../router.animations';
import { TimerComponent } from '../timer/timer.component';
import { Modal, BSModalContext } from 'angular2-modal/plugins/bootstrap';
import { Subscription } from "rxjs/Subscription";

@Component({
  selector: 'app-members',
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.css'],
  animations: [moveIn(), fallIn(), moveInLeft()],
  host: {'[@moveIn]': ''},
  providers: [Modal]
})
export class MembersComponent implements OnInit {
  @ViewChild(TimerComponent) timer: TimerComponent;
  private bidValue: string = '';
  private name: any;
  private image: any;
  private count_bids: number;
  private items: FirebaseListObservable<any>;
  private prods: FirebaseListObservable<any>;
  private bids: FirebaseListObservable<any>;
  private product: FirebaseListObservable<any>;
  private lastBid: FirebaseListObservable<any>;
  private startingBid: number;
  private snapshot_price: FirebaseListObservable<any>;
  private subscriptions: Array<Subscription> = []; 

  constructor(private af: AngularFire, private router: Router, private modal: Modal) {

   this.af.auth.subscribe(auth => {
      if(auth) {
        this.name = auth;
        
      }
    });

    this.bids = this.af.database.list('/bids', {
       preserveSnapshot: true,
       query: {
         orderByChild: 'name',
         equalTo: this.name.auth.displayName,
       }
   });

   this.product = this.af.database.list('/products', {
      query: {
        limitToLast: 1
      } 
   });

   this.prods = this.af.database.list('/products');

    this.items = this.af.database.list('/bids', {
       query: {
        
        
      } 
    }).map((array) => array.reverse()) as FirebaseListObservable<any[]>;

    this.lastBid = this.af.database.list('/bids', {
      query: {
        limitToLast: 1
      }
      
    });

    this.snapshot_price = this.af.database.list('/bids', {
      query: {
        limitToLast: 1
      },
      preserveSnapshot: true
      
    });

   this.subscriptions.push(
     this.snapshot_price.subscribe(snapshots => {
       snapshots.forEach(snapshot => {this.snapshot_price = snapshot.val();});
      }) 
     );

  this.subscriptions.push(this.bids.map( list => list.length).subscribe(length => this.count_bids = length));
  this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.startingBid = item.product_price)));
}


  bid(placedBid: number) {

  var compare = Number(this.snapshot_price[Object.keys(this.snapshot_price)[0]]);

  if(placedBid < this.startingBid || placedBid == this.startingBid || placedBid == 0 || isNaN(placedBid)) {
     console.log('Price Must Be Larger Than Starting Bid');
  }

  else if(placedBid == compare || placedBid < compare) {
     console.log('Price Must Be Larger Than Bidding Price');    
  }

  else {
     this.items.push({ bid: placedBid, name: this.name.auth.displayName,image: this.name.auth.photoURL});
     this.bidValue = '';
  }
  console.log(this.name.auth.displayURL);
 }

 removeBids() {
    this.modal.confirm()
        .size('sm')
        .isBlocking(true)
        .keyboard(27)
        .title('Leaving Room')
        .body(`<h4>Resign from your bids ?</h4>`)
        .okBtn('Confirm')
        .cancelBtn('Cancel')
        .open()
        .catch((err: any) => console.log('ERROR: ' + err))
        .then((dialog: any) => { return dialog.result })
        .then((result: any) => this.timer.removeBids() )
        .then((result: any) => this.router.navigate(['/rooms']) )
        .catch((err: any) => { });
   }

  ngOnInit() {}

  ngOnDestroy() {
    this.subscriptions.forEach((subscription: Subscription) => {
            subscription.unsubscribe();
     });
  }
}
