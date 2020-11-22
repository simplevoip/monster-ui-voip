define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		moment = require('moment'),
		datatables = require('datatables'),
		monster = require('monster'),
		timezone = require('monster-timezone');

	var app = {

		requests: {},

		subscribe: {
			'voip.accountManagement.render': 'ordersRender'
		},

		appFlags: {
			quote_updated: false
		},

		deviceIcons: {},

		/* Orders */
		ordersRender: function(args) {
			var self = this,
				args = args || {},
				parent = args.parent || $('.right-content'),
				_orderId = args.orderId,
				_sortBy = args.sortBy,
				callback = args.callback;

			self.ordersGetData(function(orders) {
				var template = $(self.getTemplate({
						name: 'layout',
						submodule: 'accountManagement'
					}));

				parent
					.empty()
					.append(template);

				self.ordersRenderTables(orders.data);

				self.ordersBindEvents(template, parent, orders.data);

				callback && callback();
			});
		},

		ordersGetData: function(callback) {
			var self = this;

			monster.request({
				resource: 'sv.orders.list',
				data: {
					accountId: self.accountId
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to retrieve orders');
				}
			});
		},

		ordersRenderTables: function(orders) {
			var self = this;

			ordersFormattedData = self.ordersDataFormat(orders);

			var quotes = ordersFormattedData.filter(function(order) {
				return order.orderStatus === 'PENDING' && order.customerApprovalDate === '';
			});

			if (quotes.length) {
				var quotes_table = $('#table_quotes').DataTable({
					destroy: true,
					data: quotes,
					createdRow: (row, data, dataIndex) => {
						$(row).attr('data-id', data.orderId);
					},
					columns: [
						{
							title: 'ID',
							data: 'orderId',
							render: self.render_quote_id
						},
						{ title: 'Due', data: 'dueDate' },
						{ title: 'Type', data: 'orderType' },
						{ title: 'Site', data: 'siteNumber' },
						{ title: 'Phone #', data: 'phoneNumbers' },
						{ title: 'City', data: 'city' },
						{ title: 'State', data: 'state' },
						{ title: 'Created', data: 'createDate' },
						{
							title: 'NRC',
							data: 'totalNrc',
							render: self.render_dollars
						},
						{
							title: 'MRC',
							data: 'totalMrc',
							render: self.render_dollars
						}
					],
					order: [
						[0, 'asc']
					],
					language: {
						paginate: {
							previous: '&larr;',
							next: '&rarr;'
						}
					}
				});
			}

			var non_quote_orders = _.difference(ordersFormattedData, quotes, 'orderId');

			if (non_quote_orders.length) {
				var orders_table = $('#table_orders').DataTable({
					destroy: true,
					data: non_quote_orders,
					createdRow: (row, data, dataIndex) => {
						$(row).attr('data-id', data.orderId);
					},
					columns: [
						{
							title: 'ID',
							data: 'orderId',
							render: self.render_order_id
						},
						{ title: 'Site', data: 'siteNumber' },
						{ title: 'Type', data: 'orderType' },
						{ title: 'Installation', data: 'installation' },
						{ title: 'Status', data: 'orderStatus' },
						{ title: 'Due', data: 'dueDate' },
						{ title: 'LNP Status', data: 'lnpStatus' },
						{ title: 'FOC Date', data: 'focDate' },
						{ title: 'TNs', data: 'phoneNumbers' }
					],
					order: [
						[0, 'asc']
					],
					language: {
						paginate: {
							previous: '&larr;',
							next: '&rarr;'
						}
					}
				});
			}
		},

		ordersDataFormat: function(orders) {
			orders.forEach(function(order, orderIndex) {
				//  concatenate DIDs
				var did_ary = [],
					matches = [],
					regex = /([0-9]+)/m;
				if (order.did && order.did.length) {
					if ((m = regex.exec(order.did)) !== null) {
						did_ary.push(m[0]);
					}
				}
				if (order.orderType.toLowerCase() === 'lnp') {
					if (order.did2 && order.did2.length) {
						if ((m = regex.exec(order.did2)) !== null) {
							did_ary.push(m[0]);
						}
					}
					if (order.did3 && order.did3.length) {
						if ((m = regex.exec(order.did3)) !== null) {
							did_ary.push(m[0]);
						}
					}
					if (order.did4 && order.did4.length) {
						if ((m = regex.exec(order.did4)) !== null) {
							did_ary.push(m[0]);
						}
					}
				}
				orders[orderIndex].phoneNumbers = '';
				if (did_ary.length) {
					orders[orderIndex].phoneNumbers = _.map(did_ary, monster.util.formatPhoneNumber).join('<br>');
				}
			});

			return orders;
		},

		ordersOrderDataFormat: function(order) {
			order.notes = order.notes.replace(/(\r\n|\n|\r)/gm, '<br>');

			return order;
		},

		ordersQuoteDataFormat: function(order) {
			// set LNP trigger message for quotes
			var lnp_trigger_message = '';
			if (order.lnpOrderSubmitDays === 100) {
				lnp_trigger_message = 'Submit After Install/QA';
			} else if (order.lnpOrderSubmitDays === 0) {
				lnp_trigger_message = 'Port On NEWSITE Order Due Date';
			} else if (order.lnpOrderSubmitDays > 0) {
				lnp_trigger_message = `NEWSITE Due Date + ${order.lnpOrderSubmitDays} Business Day(s)`;
			} else if (order.lnpOrderSubmitDays < 0) {
				lnp_trigger_message = `NEWSITE Due Date ${order.lnpOrderSubmitDays} Business Day(s)`;
			}
			order.lnpTriggerMessage = lnp_trigger_message;

			// set dispatchdate and duedaterequired
			var dispatch_date = '',
				duedate_required = false;
			if (order.orderType.toLowerCase() === 'dispatch') {
				if (order.focDispatchDays === null) {
					dispatch_date = order.dueDate;
					duedate_required = true;
				} else if (order.focDispatchDays === 0) {
					dispatch_date = 'On FOC Date';
				} else if (order.focDispatchDays > 0) {
					dispatch_date = `FOC + ${foc_dispatch_days} Business Days`;
				} else if (order.focDispatchDays < 0) {
					dispatch_date = `FOC ${foc_dispatch_days} Business Days`;
				}
			}
			order.dispatchDate = dispatch_date;
			order.dueDateRequired = duedate_required;

			// set orderdate
			order.orderDate = moment().format('YYYY-MM-DD');

			// set validation messages
			var validation_messages = [],
				orderValidated = true,
				now = moment(),
				duedate = moment(order.dueDate),
				order_item_details = [];

			if (order.linkedOrder) {
				order.linkedOrder.orderItems.forEach(function(item) {
					item.orderItemDetails.forEach(function(itemDetail) {
						itemDetail.itemName = item.name;
						order_item_details.push(itemDetail);
					});
				});
			}
			order.linkedOrderItemDetails = order_item_details;

			if (order.orderType.toLowerCase() === 'newsite') {
				if (order.term === 0) {
					validation_messages.push('ERROR: Missing Term.');
					orderValidated = false;
				}
				if (order.didType === null || order.didType === '') {
					validation_messages.push('ERROR: Porting option.');
					orderValidated = false;
				}
				if (order.installation === null || order.installation === '') {
					validation_messages.push('ERROR: Missing installation option.');
					orderValidated = false;
				}
				if (order.shipSpeed === null || order.shipSpeed === '') {
					validation_messages.push('ERROR: Missing ship speed.');
					orderValidated = false;
				}
				if (duedate.diff(now) < 0) {
					validation_messages.push('ERROR: Invalid due date.');
					orderValidated = false;
				}
			}

			if (order.orderType.toLowerCase() === 'dispatch') {
				if (order.linkedOrderItemDetails.length === 0) {
					validation_messages.push('ERROR: No valid order item details found.');
					orderValidated = false;
				}
				if (duedate_required && duedate.diff(now) < 0) {
					validation_messages.push('ERROR: Invalid due date.');
					orderValidated = false;
				}
				if (order.sow === null || (order.quoteNotes === null || order.quoteNotes.length === 0)) {
					validation_messages.push('ERROR: No valid SOW details attached.');
					orderValidated = false;
				}
			}

			if (order.orderType.toLowerCase() === 'lnp') {
				if (order.did === null || order.did === '') {
					validation_messages.push('ERROR: No phone numbers on order.');
					orderValidated = false;
				}
			} else {
				if (order.orderItems.length === 0) {
					validation_messages.push('ERROR: No order items found.');
					orderValidated = false;
				}
			}

			order.validationMessages = validation_messages;

			// split the SOW into two parts to allow for inserting order data
			if (order.sow !== null && order.sow.length) {
				var sow = order.sow.split('{{SOW_DETAILS}}');
				order.sowPart1 = sow[0];
				order.sowPart2 = sow[1];
			}

			// set orderitem options/calculations
			var rental_options = 0,
				total_rental = 0,
				total_rental_nrc = 0,
				total_purchase = 0,
				total_purchase_nrc = 0,
				has_rental_items = false;

			order.orderItems.forEach(function(item, itemIndex) {
				if (item.itemType.toLowerCase() === 'product') {
					order.orderItems[itemIndex].mrc = 0;
				}

				order.orderItems[itemIndex].totalMrc += order.orderItems[itemIndex].mrc * order.orderItems[itemIndex].qty;
				order.orderItems[itemIndex].totalNrc += order.orderItems[itemIndex].nrc * order.orderItems[itemIndex].qty;

				if (item.itemSubType.toLowerCase() === 'rental') {
					rental_options++;
				}

				if (item.rentalMrc > 0) {
					has_rental_items = true;
					total_rental += item.rentalMrc * item.qty;
					total_rental_nrc += item.nrc * item.qty;
				}
				if (item.purchaseNrc > 0) {
					total_purchase += item.mrc * item.qty;
					total_purchase_nrc += item.purchaseNrc * item.qty;
				}
			});
			order.rentalOptions = rental_options;
			order.totalRental = total_rental;
			order.totalRentalNrc = total_rental_nrc;
			order.totalPurchase = total_purchase;
			order.totalPurchaseNrc = total_purchase_nrc;
			order.hasRentalItems = has_rental_items;
			order.grandTotalPurchaseNrc = order.totalNrc + order.totalPurchaseNrc;
			order.grandTotalPurchaseMrc = order.totalMrc - order.totalPurchase;
			order.grandTotalRentalNrc = order.totalNrc - order.totalRentalNrc;
			order.grandTotalRentalMrc = order.totalMrc + order.totalRental;

			// set purchase/rental options
			order.hasPurchaseOption = false;
			order.hasRentalOption = false;
			if (order.rentalOptions > 0) {
				if (order.orderType.toLowerCase() === 'newsite' || order.orderType.toLowerCase() === 'equipment' || order.orderType.toLowerCase() === 'change') {
					order.hasPurchaseOption = true;
				}
			} else {
				// if (($orderType == 'NEWSITE' || $orderType == 'CHANGE') && $hasRentalItems) {
				if ((order.orderType.toLowerCase() === 'newsite' || order.orderType.toLowerCase() === 'change') && order.hasRentalItems) {
					order.hasRentalOption = true;
				}
			}

			// set tax message flag
			order.getsTaxMessage = false;
			if (order.orderType.toLowerCase() === 'newsite' || order.orderType.toLowerCase() === 'equipment' || order.orderType.toLowerCase() === 'change') {
				order.getsTaxMessage = true;
			}

			// set install note flag
			order.getsInstallNote = false;
			if (order.installation === 'customer') {
				order.getsInstallNote = true;
			}

			// set approval message
			order.approvalMessage = 'I approve this order';
			if (order.orderType.toLowerCase() === 'equipment') {
				order.approvalMessage = 'Submit Order';
			}

			return order;
		},

		render_quote_id: function(data, type, row, meta) {
			var self = this;

			if (type === 'display' && row.dueDate !== '') {
				return `<a href="#" class="quote-link" data-quoteid="${data}">${data}</a>`;
			}
			return data;
		},

		render_order_id: function(data, type, row, meta) {
			var self = this;

			if (type === 'display') {
				return `<a href="#" class="order-link" data-orderid="${data}">${data}</a>`;
			}
			return data;
		},

		render_dollars: function(data, type, row, meta) {
			var self = this;

			if (type === 'display') {
				return data ? '$' + data.toFixed(2) : '$0.00';
			}
			return data;
		},

		ordersBindEvents: function(template, parent, data) {
			var self = this;

			template.find('#table_quotes tbody').on('click', '.quote-link', function(evt) {
				var orderId = $(evt.target).data('quoteid');
				self.ordersGetOrder(orderId, function(order) {
					var formattedOrder = self.ordersQuoteDataFormat(order.data);
					self.ordersRenderQuote(formattedOrder);
				});
			});

			template.find('#table_orders tbody').on('click', '.order-link', function(evt) {
				var orderId = $(evt.target).data('orderid');
					// order = _.find(data, function(item) {
					// 	return item.orderId === orderId;
					// });

				self.ordersGetOrder(orderId, function(order) {
					var formattedOrder = self.ordersOrderDataFormat(order.data);
					self.ordersRenderOrder(formattedOrder);
				});
			});
		},

		ordersRenderQuote: function(currentOrder) {
			var self = this,
				template = $(self.getTemplate({
					name: 'quote',
					data: currentOrder,
					submodule: 'accountManagement'
				})),
				approveForm = template.find('#form_quote_approve');

			monster.ui.validate(approveForm, {
				rules: {
					'signature': {
						required: true
					}
				}
			});

			var popup = monster.ui.dialog(template, {
				title: self.i18n.active().orders.dialog.quoteTitle,
				onClose: function() {
					if (self.appFlags.quote_updated) {
						self.ordersRender();
					}
				}
			});

			self.ordersQuoteBindEvents({
				template: template,
				data: currentOrder,
				popup: popup
			});
		},

		ordersRenderOrder: function(currentOrder) {
			var self = this,
				template = $(self.getTemplate({
					name: 'order',
					data: currentOrder,
					submodule: 'accountManagement'
				}));

			var popup = monster.ui.dialog(template, {
				title: self.i18n.active().orders.dialog.orderTitle
			});

			self.ordersOrderBindEvents({
				template: template,
				data: currentOrder,
				popup: popup
			});
		},

		ordersQuoteBindEvents: function(args) {
			var self = this,
				template = args.template,
				data = args.data,
				popup = args.popup;

			if (template.find('#sowPart1').length) {
				template.find('#sowPart1').html(data.sowPart1);
			}

			if (template.find('#sowPart2').length) {
				template.find('#sowPart2').html(data.sowPart2);
			}

			template.find('[name="dueDate"]').on('change', function(evt) {
				var formData = monster.ui.getFormData('form_quote_update');

				self.ordersUpdateQuoteDueDate(data.orderId, formData.dueDate, function(response) {
					let message = '';
					if (response.error) {
						message = response.error;
					} else {
						self.appFlags.quote_updated = true;
						message = response.data.message;
					}
					monster.ui.alert('info', response.data.message);
				});
			});

			template.find('[name="rb_rental"]').on('click', function(evt) {
				var toggle = $(this).val().toUpperCase();

				self.ordersToggleQuotePurchaseRental(data.orderId, toggle, function(response) {
					let message = '';
					if (response.error) {
						message = response.error;
					} else {
						self.appFlags.quote_updated = true;
						message = response.data.message;
					}
					monster.ui.alert('info', response.data.message);
				});
			});

			template.find('[name="signature"]').on('keyup', self.showSignature);

			template.find('.close-link').on('click', function(evt) {
				popup.dialog('close').remove();
			});

			template.find('.approve-link').on('click', function(evt) {
				var formData = monster.ui.getFormData('form_quote_approve'),
					approveForm = template.find('#form_quote_approve');

				if (monster.ui.valid(approveForm)) {
					// show/hide sections
					$('#approved_due_date').text($('[name="dueDate"]').val())
					$('#form_quote_update').hide();
					$('#approved_due_date').show();
					$('#approved_total_purchase').hide();
					$('#approved_total_rental').hide();

					$('#unapproved_signature').hide();
					$('#approved_signature').show();
					$('#approved_signature_date').text(moment().format("YYYY-MM-DD HH:mm:ss") + ' CST');
					$('#approved_signature_details').show();

					$('[name="rb_rental"]').hide();

					$('.row-fluid').addClass('row');
					$('.row').removeClass('row-fluid');
					// get modal markup
					var markup = $('.monster-popup[data-type="quote"]').html();

					$('.row').addClass('row-fluid');
					$('.row-fluid').removeClass('row');

					self.ordersApproveQuote(data.orderId, formData.signature, markup, function(response) {
						let message = '';
						if (response.error) {
							message = response.error;
						} else {
							self.ordersRender();
							message = response.data.message;
						}
						popup.dialog('close').remove();
						monster.ui.alert('info', message);
					});
				}
			});
		},

		ordersOrderBindEvents: function(args) {
			var self = this,
				template = args.template,
				data = args.data,
				popup = args.popup;

			if (template.find('#notes').length) {
				template.find('#notes').html(data.notes);
			}

			template.find('.close-link').on('click', function(evt) {
				popup.dialog('close').remove();
			});
		},

		ordersGetOrder: function(orderId, callback) {
			monster.request({
				resource: 'sv.order.get',
				data: {
					orderId: orderId
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to retrieve order');
				}
			});
		},

		ordersUpdateQuoteDueDate: function(orderId, dueDate, callback) {
			monster.request({
				resource: 'sv.quote.update.duedate',
				data: {
					orderId: orderId,
					dueDate: dueDate
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to update due date');
				}
			});
		},

		ordersToggleQuotePurchaseRental: function(orderId, toggle, callback) {
			monster.request({
				resource: 'sv.quote.toggle.rental',
				data: {
					orderId: orderId,
					toggle: toggle
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to update rental/purchase status');
				}
			});
		},

		ordersApproveQuote: function(orderId, signature, markup, callback) {
			monster.request({
				resource: 'sv.quote.approve',
				data: {
					orderId: orderId,
					name: signature,
					data: {
						firstname: monster.apps.auth.currentUser.first_name,
						lastname: monster.apps.auth.currentUser.last_name,
						markup: markup
					}
				},
				success: function(data) {
					callback && callback(data);
				},
				error: function() {
					console.log('Failed to approve quote');
				}
			});
		},

		showSignature: function(evt) {
			var signature = $(this).val();
			$('.showSignature').text(signature);
		}

	};

	return app;
});
