import {Component, ViewContainerRef, ViewEncapsulation, OnInit, OnDestroy} from '@angular/core';
import { Overlay, overlayConfigFactory } from 'angular2-modal';
import { Modal, BSModalContext } from 'angular2-modal/plugins/bootstrap';
import { Router } from '@angular/router';
import { AngularFire, FirebaseListObservable } from 'angularfire2';
import { Subscription } from "rxjs/Subscription";

@Component({
  selector: 'app-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.css'],
  providers: [Modal]
})

export class TimerComponent implements OnInit {
    private name: any;
    private product_key: any;
    private product_name: any;
    private product_desc: any;
    private product_img1: any;
    private product_img2: any;
    private product_img3: any;
    private product_price: number;
    private bids: FirebaseListObservable<any>;
    private remove: FirebaseListObservable<any>;
    private history: FirebaseListObservable<any>;
    private product: FirebaseListObservable<any>;
    private fillerHeight: number;
    private fillerIncrement: number;
    private seconds: number;
    private minutes: number;
    private started: boolean;
    private subscriptions: Array<Subscription> = [];

  constructor(private af: AngularFire, private router: Router, private modal: Modal) {

    this.af.auth.subscribe(auth => {
      if(auth) {
        this.name = auth;
      }
    });

    this.remove = this.af.database.list('/bids', {
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

   this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.product_name = item.product_name)));
   this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.product_desc = item.product_desc)));
   this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.product_img1 = item.product_img1)));
   this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.product_img2 = item.product_img2)));
   this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.product_img3 = item.product_img3)));
   this.subscriptions.push(this.product.subscribe( products => products.forEach(item => this.product_price = item.product_price)));
   this.subscriptions.push(this.product.subscribe( bids => bids.forEach(item => this.product_key = item.$key)));
   this.history = this.af.database.list('/history');
   this.bids = this.af.database.list('/bids',  {  query: {limitToLast: 1 }, preserveSnapshot: true } );
   this.subscriptions.push(this.bids.subscribe(snapshots => {snapshots.forEach(snapshot => {this.bids = snapshot.val();}); }));
   this.started = false;  
   this.minutes = 1;
   this.seconds = 0;
   this.fillerIncrement = 200/(this.minutes*60);
   this.fillerHeight = 0; 
   this.init();
  }

 resetVariables(mins, secs, started) {
      this.minutes = mins;
      this.seconds = secs;
      this.started = started;
      this.fillerIncrement = 200/(this.minutes*60);
      this.fillerHeight = 0;  
   }

  startTimer() {
      this.resetVariables(1, 0, true);
  };

  stopTimer() {
      this.resetVariables(1, 0, false);
  };

  timerComplete() {
      this.started = false;
      this.resolveWinner(this.bids);
  }

  removeBids() {
    this.remove.subscribe( items =>{ items.forEach(item => { item.ref.remove();});}, error => {} );
    var syncBids = this.af.database.list('/bids',  {  query: {limitToLast: 1 }, preserveSnapshot: true } );
    syncBids.subscribe(snapshots => {snapshots.forEach(snapshot => {syncBids = snapshot.val();}); });
    this.bids = syncBids;

  }

  intervalCallback() {  
    if(!this.started) return false;
      if(this.seconds == 0) {
        if(this.minutes == 0) {
          this.timerComplete();
          return;
        }
        this.seconds = 59;
        this.minutes--;
        } else {
          this.seconds--;
      }
      this.fillerHeight += this.fillerIncrement;
  };

  toDoubleDigit(num) {
     return num < 10 ? '0' + parseInt(num,10) : num;
  };

  init() {
    setInterval( () => {
      this.intervalCallback.apply(this);
    }, 1000);
  };

  ngOnInit() {
    this.startTimer();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription: Subscription) => {
            subscription.unsubscribe();
     });
  }

  resolveWinner(bids) {
    var bid = Number(bids[Object.keys(bids)[0]]);
    var winner = bids[Object.keys(bids)[2]];

    if(bid && winner) {

    var remove_bids = this.af.database.list('/bids');
    var sold_products = this.af.database.list('/sold_products');

    this.history.push({ bid: bid, winner: winner, product_name: this.product_name, product_img: this.product_img1});

    sold_products.push({
      product_name: this.product_name,
      product_desc: this.product_desc,
      product_img1: this.product_img1,
      product_img2: this.product_img2,
      product_img3: this.product_img3,
      product_price: this.product_price
    });

    this.modal.alert()
        .size('sm')
        .isBlocking(true)
        .keyboard(27)
        .title('The Bidding Winner')
        .body(`<h4>The Winner is ${winner} with the bidding amount of ${bid}. </h4>`).open()
        // .catch((err: any) => console.log('ERROR: ' + err))
        .then((dialog: any) => { return dialog.result })
        .then((result: any) => remove_bids.remove() )
        .then((result: any) => this.product.remove(this.product_key) )
        .then((result: any) => this.router.navigate(['/rooms']) )
        .catch((err: any) => { });
    }
    else {
       this.modal.alert()
        .size('sm')
        .isBlocking(true)
        .keyboard(27)
        .title('The Bidding Winner')
        .body(`<h4>There is no winner for the bidding session.</h4>`).open()
        // .catch((err: any) => console.log('ERROR: ' + err))
        .then((dialog: any) => { return dialog.result })
        .then((result: any) => this.router.navigate(['/rooms']) )
        .catch((err: any) => { });
    }
  }
}
