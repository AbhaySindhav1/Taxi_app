import { Component, Inject, OnInit } from '@angular/core';
import { Form } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { loadStripe } from '@stripe/stripe-js';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from 'src/app/Services/users.service';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
})
export class CardComponent implements OnInit {
  selectedCard: any;
  form: Form | any;
  stripe: any;
  FormDisplay = false;
  submitBtn: any;
  elements: any;
  options = {
    mode: 'setup',
    currency: 'usd',
    appearance: {},
  };
  paymentElement: any;

  constructor(
    public dialogRef: MatDialogRef<CardComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private userService: UsersService,
    private toastr: ToastrService
  ) {}

  cards: any;

  async loadStripe() {
    this.stripe = await loadStripe(
      'pk_test_51N93JqGPole4IExIKCJEeJeBeKyHTnvzng0TyDxVkWRypNfpHBpHOKVTmLJ2c7uRvdnRVTGvlbh2LsD95VEGWTdT00iQYhTiR0'
    );
  }

  async ngOnInit() {
    this.getCards();
    this.loadStripe();
  }

  async addCardButton() {
    this.FormDisplay = true;

    this.form = document.getElementById('payment-form') as HTMLFormElement;
    this.submitBtn = document.getElementById('submit') as HTMLButtonElement;

    setTimeout(() => {
      this.elements = this.stripe.elements(this.options);

      this.paymentElement = this.elements.create('payment', {
        layout: {
          type: 'accordion',
          defaultCollapsed: false,
          radios: true,
          spacedAccordionItems: false,
        },
      });

      this.paymentElement.mount('#payment-element');
      this.form = document.getElementById('payment-form');
      this.submitBtn = document.getElementById('submit');
    }, 500);
  }

  async AddCards() {
    if (this.submitBtn.disabled) {
      return;
    }

    this.submitBtn.disabled = true;

    const { error: submitError } = await this.elements.submit();

    if (submitError) {
      this.handleError(submitError);
      return;
    }
    const res = await fetch(
      'http://localhost:3000/StripeInt/' + this.data._id,
      {
        method: 'POST',
      }
    );

    const { client_secret: clientSecret } = await res.json();

    let elements = this.elements;

    const { error } = await this.stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: 'http://localhost:4200/#/users',
      },
    });

    if (error) {
      this.handleError(error);
    } else {
    }
  }

  handleError = (error: { message: string }) => {
    const messageContainer = document.querySelector(
      '#error-message'
    ) as HTMLElement;

    messageContainer.textContent = error.message;
    this.submitBtn.disabled = false;
  };

  handleCardSelection(cardID: any, card: any) {
    this.selectedCard = card;
    console.log('Selected Card Number:', cardID);
  }

  getImageSource(name: any) {
    if (name == 'mastercard') {
      return 'https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg';
    } else if (name == 'visa') {
      return 'http://localhost:3000/uploads/cards/visa.svg';
    } else if (name == 'Rupay') {
      return 'http://localhost:3000/uploads/cards/rupay.svg';
    } else if (name == 'delete') {
      return 'http://localhost:3000/uploads/cards/delete.svg';
    }
    return null;
  }

  async getCards() {
    const res = await fetch(
      'http://localhost:3000/StripeInt/payments/' + this.data._id,
      {
        method: 'POST',
      }
    );
    let PaymentsData = await res.json();
    this.cards = PaymentsData;
  }

  async DeleteCards(id: any) {
    this.userService.onDeleteCard(id).subscribe({
      next: (data) => {
        this.cards = this.cards.filter((card: any) => {
          return card.id != data.card;
        });

        this.toastr.success(data.massge);
      },
      error: (error) => {
        console.log(error);

        this.toastr.error(error);
      },
    });
  }
}