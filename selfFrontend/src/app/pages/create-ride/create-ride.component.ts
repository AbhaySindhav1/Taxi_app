import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { RideService } from 'src/app/Services/ride.service';
import { UsersService } from 'src/app/Services/users.service';


declare var google: any;
@Component({
  selector: 'app-create-ride',
  templateUrl: './create-ride.component.html',
  styleUrls: ['./create-ride.component.css'],
})
export class CreateRideComponent implements OnInit {
  phoneNumber: any;
  user: any;
  countryer = false;
  email: any;
  name: any;
  stops: any = [];
  RideForm: FormGroup | any;
  map: google.maps.Map | any;
  isSubmitted = false;
  isServiceAvailable = false;
  isServiceZone: any = null;
  error = false;
  errMassage: any;

  constructor(
    private usersService: UsersService,
    private rideService: RideService,
    private toastr:ToastrService,
  ) {
    this.RideForm = new FormGroup({
      UserPhone: new FormControl(null, [
        Validators.required,
        Validators.pattern('^((\\+91-?)|0)?[0-9\\s-]{10}$'),
      ]),
      UserName: new FormControl(null, [Validators.required]),
      CountryCode: new FormControl(+91, [Validators.required]),
      UserEmail: new FormControl(null, [Validators.required, Validators.email]),
      PickupPoint: new FormControl(null, [Validators.required]),
      DropPoint: new FormControl(null, [Validators.required]),
    });
  }

  ngOnInit(): void {
    this.initMap();
    this.setupAutocomplete('PickupPoint');
    this.setupAutocomplete('DropPoint');
  }

  onInput(e: any) {
    if (e.value.length === 10) {
      console.log(
        (document.getElementById('CountryCode') as HTMLInputElement).value
      );
      const number =
        '+' +
        +(document.getElementById('CountryCode') as HTMLInputElement).value +
        '-' +
        e.value;
      e.value = e.value.substring(0, 10);
      console.log(number);

      this.usersService.initGetUsers(number).subscribe({
        next: (data) => {
          console.log(data);

          if (data.length === 0) {
            console.log('2');

            return;
          } else {
            if (data[0]) {
              this.user = data[0];
            }
            console.log(this.user);

            this.RideForm.patchValue({
              UserName: data[0].UserName,
              UserEmail: data[0].UserEmail,
            });
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
    }
  }

  initMap(lat = 23, lng = 73, zoom = 7) {
    let loc = { lat: +lat, lng: +lng };

    this.map = new google.maps.Map(document.getElementById('map'), {
      center: loc,
      zoom,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });
  }

  get f() {
    return this.RideForm.controls;
  }

  onAddStop() {
    const newStopIndex = this.stops.length + 1;
    console.log(newStopIndex);

    this.RideForm.addControl(
      `Drop${newStopIndex}`,
      new FormControl(null, [Validators.required])
    );

    if (this.stops.length >= 2) {
      return;
    }
    this.stops.push({ [`Drop${newStopIndex}`]: null });

    setTimeout(() => {
      const inputElement = document.getElementById(`Drop${newStopIndex}`);
      if (inputElement instanceof HTMLInputElement) {
        this.setupAutocomplete(inputElement.id);
      }
    }, 1);
    console.log(this.stops);
  }

  OnRideFormSubmit() {
    this.isSubmitted = true;
    console.log(this.RideForm.valid);
    
    console.log(this.RideForm.value);
  }

  setupAutocomplete(fieldName: string) {
    const autocomplete = new google.maps.places.Autocomplete(
      document.getElementById(fieldName),
      {
        types: [],
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place: google.maps.places.PlaceResult = autocomplete.getPlace();
      if (place.geometry === undefined || place.geometry === null) {
        return;
      }

      let lat = place.geometry.location?.lat();
      let lng = place.geometry.location?.lng();
      if (place.geometry.location?.lat()) {
        let lat = +place.geometry.location?.lat();
      }
      if (place.geometry.location?.lng()) {
        let lng = +place.geometry.location?.lng();
      }
      const location = [lng, lat];
      console.log(location);

      this.rideService.initGetLocationValidation(location).subscribe({
        next: (data) => {
          if (data.length === 0) {
            this.errMassage =
                'For This Location Service is Unavailable';
                console.log(this.errMassage);
                
          } else if (data.length > 0 && !this.isServiceZone) {
            this.isServiceZone = data[0];
            this.stops.PickupPoint = data[0].city;
            console.log(this.isServiceZone);
            console.log(this.stops);
          } else if (data.length > 0 && this.isServiceZone) {
            let isinSameZone = this.isServiceZone._id === data[0]._id;
            console.log(isinSameZone);
            if (!isinSameZone) {
              this.errMassage =
                'this entered value in not in same zone so please select from same zone';
                this.toastr.success(this.errMassage, `${fieldName} Error :`)
            } else {
              this.stops[`${fieldName}`] = data[0].city;
            }
            console.log(this.stops);
            console.log(this.errMassage);
          } 
        },
        error: (error) => {
          console.log(error);
          
        },
      });
    });
  }
}
